/**
 * Orchestration layer for voice call flows.
 * Ties together voice tier limits, assistant creation, call session management, and A/B testing.
 */

import { getDb } from "@/lib/db/queries";
import { getVoiceProvider } from "@/lib/voice";
import { compileSystemPrompt, type BusinessBrainInput } from "@/lib/business-brain";
// Rate limiter available via: import { voiceRateLimiter } from "@/lib/voice/rate-limiter";

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

  const tier = (workspace as { billing_tier?: string } | null)?.billing_tier ?? "free";

  // Map billing tier to concurrent call limit
  const tierLimits: Record<string, number> = {
    free: 1,
    pro: 5,
    enterprise: 50,
  };

  const maxConcurrent = tierLimits[tier] ?? 1;

  // Check current concurrent calls
  const { count } = await db
    .from("call_sessions")
    .select("id", { count: "exact" })
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
  if (!systemPrompt) {
    const [ctxRes, wsRes] = await Promise.all([
      db
        .from("workspace_business_context")
        .select(
          "business_name, offer_summary, business_hours, faq"
        )
        .eq("workspace_id", params.workspaceId)
        .maybeSingle(),
      db
        .from("workspaces")
        .select("name, agent_name, greeting, preferred_language")
        .eq("id", params.workspaceId)
        .maybeSingle(),
    ]);

    const ctx = ctxRes.data as
      | {
          business_name?: string;
          offer_summary?: string;
          business_hours?: Record<string, unknown>;
          faq?: Array<{ q?: string; a?: string }>;
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

    const businessName = ctx?.business_name ?? workspace?.name ?? "The business";
    const agentName = workspace?.agent_name ?? "Receptionist";
    const greeting =
      workspace?.greeting ??
      `Hello, this is ${agentName}. How can I help you today?`;

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
      preferred_language: workspace?.preferred_language ?? undefined,
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
          ab_test_variant: abVariant ? "b" : "a",
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

    const { assistantId } = await voice.createAssistant({
      name: `Outbound – ${params.workspaceId.slice(0, 8)}`,
      systemPrompt,
      voiceId,
      voiceProvider: (process.env.VOICE_PROVIDER as
        | "elevenlabs"
        | "deepgram"
        | "playht") || "elevenlabs",
      language: undefined,
      tools: [],
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

  // 1. Check tier limits
  const tierCheck = await checkVoiceTierLimits(params.workspaceId);
  if (!tierCheck.allowed) {
    console.warn(
      `[call-flow] Workspace ${params.workspaceId} exceeds concurrent call limit`
    );
    // Return simple fallback TwiML
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Sorry, all lines are busy. Please call back later.</Say></Response>`;
  }

  // 2. Check for active A/B test and assign variant
  const voiceIdOverride = await getAbTestVariant(params.workspaceId);

  // 3. Get workspace voice config
  const { data: workspace } = await db
    .from("workspaces")
    .select("default_voice_id")
    .eq("id", params.workspaceId)
    .maybeSingle();

  const voiceId =
    voiceIdOverride ||
    (workspace as { default_voice_id?: string | null } | null)
      ?.default_voice_id ||
    process.env.DEFAULT_VOICE_ID ||
    "us-female-warm-receptionist";

  // 4. Generate TwiML using voice provider
  try {
    const voice = getVoiceProvider();

    // Create a temporary assistant for this inbound call
    const { assistantId } = await voice.createAssistant({
      name: `Inbound – ${params.workspaceId.slice(0, 8)}`,
      systemPrompt: "You are a helpful receptionist. Please wait for instructions.",
      voiceId,
      voiceProvider: (process.env.VOICE_PROVIDER as
        | "elevenlabs"
        | "deepgram"
        | "playht") || "elevenlabs",
      language: undefined,
      tools: [],
      maxDuration: 600,
      silenceTimeout: 30,
      backgroundDenoising: true,
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
