/**
 * Orchestration layer for voice call flows.
 * Ties together voice tier limits, assistant creation, call session management, and A/B testing.
 */

import { getDb } from "@/lib/db/queries";
import { getVoiceProvider } from "@/lib/voice";
import { compileSystemPrompt, type BusinessBrainInput } from "@/lib/business-brain";
import { getAgentTools } from "@/lib/voice/agent-tools";
import { getTemplateCapabilities } from "@/lib/data/agent-templates";
import { getModelForPhase, type CallPhase, type ModelConfig } from "@/lib/voice/cost-optimizer";

export interface CallResult {
  callId: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed";
  provider: string;
}

export interface InitiateCallParams {
  workspaceId: string;
  phoneNumber: string;
  voiceId?: string;
  systemPrompt?: string;
  industry?: string;
  metadata?: Record<string, unknown>;
}

export interface HandleInboundCallParams {
  workspaceId: string;
  callSid: string;
  callerPhone: string;
}

const CONCURRENT_CALL_LIMITS: Record<string, number> = {
  solo: 2,
  business: 10,
  growth: 10,
  scale: 25,
  team: 25,
  enterprise: 100,
};

function normalizeTier(tier: string | null | undefined): string {
  const value = (tier ?? "solo").toLowerCase();
  if (value === "starter") return "solo";
  if (value === "pro") return "business";
  return value;
}

/**
 * Detect the initial call phase from metadata/purpose to select the right model tier.
 * The voice provider will dynamically switch models mid-call as the phase changes,
 * but we need an initial model for assistant creation.
 */
function detectInitialPhase(
  direction: "inbound" | "outbound",
  purpose?: string,
  metadata?: Record<string, unknown>,
): CallPhase {
  if (metadata?.call_phase) return metadata.call_phase as CallPhase;
  if (direction === "outbound") {
    // Outbound calls typically start with greeting → move to qualification/scheduling
    const goal = (purpose ?? "").toLowerCase();
    if (goal.includes("follow") || goal.includes("reminder")) return "scheduling";
    if (goal.includes("sale") || goal.includes("close")) return "negotiation";
    if (goal.includes("qualify") || goal.includes("lead")) return "qualification";
    if (goal.includes("voicemail")) return "voicemail";
    return "greeting";
  }
  // Inbound: start with greeting, will escalate as needed
  return "greeting";
}

/**
 * Get the voice provider string from model config.
 * Maps cost-optimizer model names to provider-specific voice provider strings.
 */
type VoiceProviderName = "elevenlabs" | "deepgram" | "deepgram-aura" | "cartesia" | "playht";

function getVoiceProviderFromModel(model: ModelConfig): VoiceProviderName {
  // Map cost-optimizer TTS model names to the voice provider union type
  const tts = model.tts;
  if (tts.startsWith("elevenlabs")) return "elevenlabs";
  if (tts.startsWith("deepgram")) return "deepgram-aura";
  if (tts.startsWith("cartesia")) return "cartesia";
  if (tts.startsWith("playht")) return "playht";
  return "deepgram-aura"; // Safe default
}

/**
 * Check if workspace has capacity for another voice call.
 * Returns { allowed: boolean, remaining: number }
 */
async function checkVoiceTierLimits(
  workspaceId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const db = getDb();

  // Get workspace billing tier
  const { data: workspace } = await db
    .from("workspaces")
    .select("billing_tier")
    .eq("id", workspaceId)
    .maybeSingle();

  const tier = normalizeTier((workspace as { billing_tier?: string } | null)?.billing_tier);
  const maxConcurrent = CONCURRENT_CALL_LIMITS[tier] ?? 2;

  // Check current concurrent calls
  const { count } = await db
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .is("call_ended_at", null);

  const currentCalls = count ?? 0;
  const remaining = Math.max(0, maxConcurrent - currentCalls);

  return {
    allowed: currentCalls < maxConcurrent,
    remaining,
  };
}

/**
 * Get active A/B test for workspace and assign variant.
 * Returns voice_id for variant A or B.
 */
async function getAbTestVariant(workspaceId: string): Promise<string | null> {
  const db = getDb();

  // Find active A/B test
  const { data: test } = await db
    .from("voice_ab_tests")
    .select("id, voice_a, voice_b, traffic_split")
    .eq("workspace_id", workspaceId)
    .eq("status", "running")
    .gt("end_date", new Date().toISOString())
    .maybeSingle();

  if (!test) return null;

  const testData = test as {
    id: string;
    voice_a: string;
    voice_b: string;
    traffic_split: number;
  };

  // Randomly assign variant based on traffic split
  const rand = Math.random();
  const variant = rand < testData.traffic_split ? "a" : "b";

  return variant === "a" ? testData.voice_a : testData.voice_b;
}

/**
 * Initiate an outbound call with voice AI.
 * Checks tier limits, gets workspace config, assigns A/B variant, creates call session, and places call.
 */
export async function initiateCall(
  params: InitiateCallParams
): Promise<CallResult> {
  const db = getDb();

  // 1. Check tier limits
  const tierCheck = await checkVoiceTierLimits(params.workspaceId);
  if (!tierCheck.allowed) {
    console.warn(
      `[call-flow] Workspace ${params.workspaceId} exceeds concurrent call limit`
    );
    return {
      callId: "",
      status: "failed",
      provider: "recall",
    };
  }

  // 2. Get voice config for workspace
  let voiceId = params.voiceId;
  if (!voiceId) {
    const { data: workspace } = await db
      .from("workspaces")
      .select("default_voice_id")
      .eq("id", params.workspaceId)
      .maybeSingle();

    voiceId =
      (workspace as { default_voice_id?: string | null } | null)
        ?.default_voice_id || process.env.DEFAULT_VOICE_ID || "us-female-warm-receptionist";
  }

  // 3. Check A/B test and override voiceId if running
  const abVariant = await getAbTestVariant(params.workspaceId);
  if (abVariant) {
    voiceId = abVariant;
  }

  // 4. Get system prompt (or use provided one)
  let systemPrompt = params.systemPrompt;
  let agentCapabilities: string[] = [];
  if (!systemPrompt) {
    const [ctxRes, wsRes, agentRes] = await Promise.all([
      db
        .from("workspace_business_context")
        .select(
          "business_name, offer_summary, business_hours, faq, timezone, industry, services, address, phone, emergencies_after_hours, appointment_handling"
        )
        .eq("workspace_id", params.workspaceId)
        .maybeSingle(),
      db
        .from("workspaces")
        .select("name, agent_name, greeting, preferred_language")
        .eq("id", params.workspaceId)
        .maybeSingle(),
      db
        .from("agents")
        .select("template_id, purpose")
        .eq("workspace_id", params.workspaceId)
        .eq("is_primary", true)
        .maybeSingle()
        .then(res => {
          if (!res.data) {
            return db.from("agents").select("template_id, purpose").eq("workspace_id", params.workspaceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
          }
          return res;
        }),
    ]);

    const ctx = ctxRes.data as
      | {
          business_name?: string;
          offer_summary?: string;
          business_hours?: Record<string, unknown>;
          faq?: Array<{ q?: string; a?: string }>;
          timezone?: string;
          industry?: string;
          services?: string;
          address?: string;
          phone?: string;
          emergencies_after_hours?: string;
          appointment_handling?: string;
        }
      | null;
    const workspace = wsRes.data as
      | {
          name?: string;
          agent_name?: string;
          greeting?: string;
          preferred_language?: string | null;
        }
      | null;
    const agent = agentRes.data as { template_id?: string; purpose?: string } | null;

    // Get agent capabilities from template
    agentCapabilities = getTemplateCapabilities(agent?.template_id);

    const businessName = ctx?.business_name ?? workspace?.name ?? "The business";
    const agentName = workspace?.agent_name ?? "AI Agent";
    const greeting =
      workspace?.greeting ??
      `Hello, this is ${agentName}. How can I help you today?`;

    // Load lead context if this is an outbound call to a known lead
    let leadContext: BusinessBrainInput["lead_context"];
    let callHistory: BusinessBrainInput["call_history"];
    if (params.metadata?.lead_id) {
      const leadId = String(params.metadata.lead_id);
      const [leadRes, historyRes] = await Promise.all([
        db.from("leads").select("name, phone, email, state, score, tags, notes, last_contacted_at").eq("id", leadId).maybeSingle(),
        db.from("call_sessions").select("call_started_at, summary, outcome, topics").eq("lead_id", leadId).not("call_ended_at", "is", null).order("call_started_at", { ascending: false }).limit(5),
      ]);
      const lead = leadRes.data as { name?: string; phone?: string; email?: string; state?: string; score?: number; tags?: string[]; notes?: string; last_contacted_at?: string } | null;
      if (lead) {
        leadContext = {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          state: lead.state,
          score: lead.score ?? undefined,
          tags: lead.tags ?? undefined,
          notes: lead.notes ?? undefined,
          last_contacted: lead.last_contacted_at ?? undefined,
        };
      }
      const history = (historyRes.data ?? []) as Array<{ call_started_at?: string; summary?: string; outcome?: string; topics?: string[] }>;
      if (history.length > 0) {
        callHistory = history.map((h) => ({
          date: h.call_started_at ?? "",
          summary: h.summary,
          outcome: h.outcome,
          topics: h.topics,
        }));
      }
    }

    const input: BusinessBrainInput = {
      business_name: businessName,
      offer_summary: ctx?.offer_summary ?? "",
      business_hours: (ctx?.business_hours ?? {}) as Record<
        string,
        { start: string; end: string } | null
      >,
      faq: ctx?.faq ?? [],
      agent_name: agentName,
      greeting,
      industry: ctx?.industry ?? params.industry ?? undefined,
      services: ctx?.services ?? undefined,
      address: ctx?.address ?? undefined,
      phone: ctx?.phone ?? undefined,
      emergencies_after_hours: ctx?.emergencies_after_hours ?? undefined,
      appointment_handling: ctx?.appointment_handling ?? undefined,
      preferred_language: workspace?.preferred_language ?? undefined,
      primary_goal: agent?.purpose ?? undefined,
      lead_context: leadContext,
      call_history: callHistory,
    };

    systemPrompt = compileSystemPrompt(input);
  }

  // 5. Create call_session record
  let callSessionId: string | null = null;
  try {
    const { data: inserted } = await db
      .from("call_sessions")
      .insert({
        workspace_id: params.workspaceId,
        call_started_at: new Date().toISOString(),
        metadata: {
          direction: "outbound",
          voice_id: voiceId,
          ab_test_variant: abVariant ? "a" : "none",
          ...params.metadata,
        },
      })
      .select("id")
      .maybeSingle();

    if (inserted) {
      callSessionId = (inserted as { id: string }).id;
    }
  } catch (err) {
    console.error("[call-flow] Failed to create call_session:", err);
    return {
      callId: "",
      status: "failed",
      provider: "recall",
    };
  }

  // 6. Create assistant and place outbound call
  try {
    const voice = getVoiceProvider();

    // Build tools list from agent capabilities
    const tools = getAgentTools(agentCapabilities);

    // Smart model routing: select initial model tier based on call purpose
    const initialPhase = detectInitialPhase("outbound", params.metadata?.purpose as string | undefined, params.metadata);
    const modelConfig = getModelForPhase(initialPhase);

    const { assistantId } = await voice.createAssistant({
      name: `Outbound – ${params.workspaceId.slice(0, 8)}`,
      systemPrompt,
      voiceId,
      voiceProvider: getVoiceProviderFromModel(modelConfig),
      language: undefined,
      tools,
      maxDuration: 600,
      silenceTimeout: 30,
      backgroundDenoising: true,
    });

    const result = await voice.createOutboundCall({
      assistantId,
      phoneNumber: params.phoneNumber,
    });

    // Update call_session with call_sid if available
    if (callSessionId && result.callId) {
      await db
        .from("call_sessions")
        .update({ external_meeting_id: result.callId })
        .eq("id", callSessionId);
    }

    return result;
  } catch (err) {
    console.error("[call-flow] Voice provider error:", err);
    return {
      callId: callSessionId ?? "",
      status: "failed",
      provider: "recall",
    };
  }
}

/**
 * Handle inbound call from Twilio.
 * Returns TwiML that streams to voice server WebSocket.
 */
export async function handleInboundCall(
  params: HandleInboundCallParams
): Promise<string> {
  const db = getDb();
  const busyVoicemailTwiml =
    '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">All agents are busy. Please hold or leave a message after the tone.</Say><Record maxLength="120" playBeep="true" /></Response>';

  // 0) Workspace guardrails before call processing.
  const { data: workspace } = await db
    .from("workspaces")
    .select("billing_status, status, billing_tier")
    .eq("id", params.workspaceId)
    .maybeSingle();
  const ws = workspace as {
    billing_status?: string | null;
    status?: string | null;
    billing_tier?: string | null;
  } | null;
  const billingStatus = ws?.billing_status ?? "trial";
  const workspaceStatus = ws?.status ?? "active";
  const billingAllowed =
    billingStatus === "active" ||
    billingStatus === "trial" ||
    billingStatus === "trial_expired";
  const statusAllowed = workspaceStatus !== "paused" && workspaceStatus !== "payment_failed";
  if (!billingAllowed || !statusAllowed) {
    return busyVoicemailTwiml;
  }

  const { count: activeAgentCount } = await db
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", params.workspaceId);
  if ((activeAgentCount ?? 0) < 1) {
    return busyVoicemailTwiml;
  }

  // 1. Check tier limits
  const tierCheck = await checkVoiceTierLimits(params.workspaceId);
  if (!tierCheck.allowed) {
    return busyVoicemailTwiml;
  }

  // 2. Check for active A/B test and assign variant
  const voiceIdOverride = await getAbTestVariant(params.workspaceId);

  // 3. Get workspace voice config
  const { data: workspaceVoiceConfig } = await db
    .from("workspaces")
    .select("default_voice_id")
    .eq("id", params.workspaceId)
    .maybeSingle();

  const voiceId =
    voiceIdOverride ||
    (workspaceVoiceConfig as { default_voice_id?: string | null } | null)
      ?.default_voice_id ||
    process.env.DEFAULT_VOICE_ID ||
    "us-female-warm-receptionist";

  // 4. Compile system prompt with business brain (same as outbound)
  let compiledPrompt = "You are a helpful receptionist. Answer calls professionally.";
  let agentTools: ReturnType<typeof getAgentTools> = [];
  try {
    // Load primary agent, workspace context, and caller context in parallel
    const [agentResult, businessCtxResult, leadResult, historyResult] = await Promise.all([
      // Try primary agent first; fall back to most recently created agent if is_primary column missing
      db.from("agents").select("*").eq("workspace_id", params.workspaceId).eq("is_primary", true).maybeSingle()
        .then(res => {
          if (res.error && !res.data) {
            // is_primary column may not exist yet — fall back to first active agent
            return db.from("agents").select("*").eq("workspace_id", params.workspaceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
          }
          // If query succeeded but returned null (no primary), also fall back
          if (!res.data) {
            return db.from("agents").select("*").eq("workspace_id", params.workspaceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
          }
          return res;
        }),
      db.from("workspace_business_context").select("*").eq("workspace_id", params.workspaceId).maybeSingle(),
      db.from("leads").select("id, name, phone, email, state, score, tags, notes, last_contacted_at").eq("workspace_id", params.workspaceId).eq("phone", params.callerPhone).maybeSingle(),
      // Placeholder — real lead-specific history loaded below after lead ID is known
      Promise.resolve({ data: null }),
    ]);

    const agent = agentResult.data as Record<string, unknown> | null;
    const bizCtx = businessCtxResult.data as Record<string, unknown> | null;
    const lead = leadResult.data as Record<string, unknown> | null;

    // Load call history for the specific lead (not workspace-wide) — completed calls only
    let history: Array<Record<string, unknown>> = [];
    if (lead?.id) {
      const { data: leadHistory } = await db
        .from("call_sessions")
        .select("call_started_at, summary, outcome, topics")
        .eq("lead_id", lead.id as string)
        .not("call_ended_at", "is", null)
        .order("call_started_at", { ascending: false })
        .limit(5);
      history = (leadHistory ?? []) as Array<Record<string, unknown>>;
    }

    const brainInput: BusinessBrainInput = {
      agent_name: (agent?.name as string) || "Receptionist",
      business_name: (bizCtx?.business_name as string) || "",
      offer_summary: (bizCtx?.offer_summary as string) || "",
      business_hours: (bizCtx?.business_hours as Record<string, { start: string; end: string } | null>) || undefined,
      faq: (bizCtx?.faq as Array<{ q?: string; a?: string }>) ?? [],
      services: (bizCtx?.services as string) || undefined,
      address: (bizCtx?.address as string) || undefined,
      phone: (bizCtx?.phone as string) || undefined,
      emergencies_after_hours: (bizCtx?.emergencies_after_hours as string) || undefined,
      appointment_handling: (bizCtx?.appointment_handling as string) || undefined,
      preferred_language: (agent?.preferred_language as string) || (agent?.language as string) || "en",
      primary_goal: (agent?.purpose as string) || (agent?.goal as string) || "answer_route",
      greeting: (agent?.greeting as string) || undefined,
      industry: (bizCtx?.industry as string) || undefined,
      lead_context: lead ? {
        name: (lead.name as string) || undefined,
        phone: (lead.phone as string) || undefined,
        email: (lead.email as string) || undefined,
        state: (lead.state as string) || undefined,
        score: (lead.score as number) || undefined,
        tags: (lead.tags as string[]) || undefined,
        notes: (lead.notes as string) || undefined,
        last_contacted: (lead.last_contacted_at as string) || undefined,
      } : undefined,
      call_history: history.length > 0 ? history.map(h => ({
        date: (h.call_started_at as string) || "",
        summary: (h.summary as string) || "",
        outcome: (h.outcome as string) || "",
        topics: (h.topics as string[]) || [],
      })) : undefined,
    };

    compiledPrompt = compileSystemPrompt(brainInput);

    // Load agent tools based on template capabilities
    const templateId = (agent?.template_id as string) || undefined;
    const capabilities = templateId ? getTemplateCapabilities(templateId) : undefined;
    agentTools = getAgentTools(capabilities ?? []);
  } catch (promptErr) {
    console.warn("[call-flow] Failed to compile inbound system prompt, using fallback:", promptErr);
  }

  // 5. Generate TwiML using voice provider
  try {
    const voice = getVoiceProvider();

    // Smart model routing: inbound calls start in greeting phase (economy tier)
    const initialPhase = detectInitialPhase("inbound");
    const modelConfig = getModelForPhase(initialPhase);

    // Create assistant with full business brain context and tools
    const { assistantId } = await voice.createAssistant({
      name: `Inbound – ${params.workspaceId.slice(0, 8)}`,
      systemPrompt: compiledPrompt,
      voiceId,
      voiceProvider: getVoiceProviderFromModel(modelConfig),
      language: undefined,
      tools: agentTools,
      maxDuration: 600,
      silenceTimeout: 30,
      backgroundDenoising: true,
      metadata: { workspace_id: params.workspaceId },
    });

    const twiml = await voice.createInboundCall(
      params.callSid,
      assistantId
    );

    return twiml;
  } catch (err) {
    console.error("[call-flow] Failed to generate inbound TwiML:", err);
    // Fallback to basic TwiML
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thank you for calling. Please hold.</Say><Pause length="2"/></Response>`;
  }
}
