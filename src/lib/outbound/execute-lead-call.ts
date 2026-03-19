/**
 * Execute an outbound call to a lead. Used by POST /api/outbound/call and by speed-to-lead cron.
 * No auth — caller must ensure workspaceId and leadId are authorized.
 */

import { getDb } from "@/lib/db/queries";
import { compileSystemPrompt } from "@/lib/business-brain";
import { getVoicemailConfigForBehavior } from "@/lib/vapi/voicemail-detection";
import { buildFirstMessageWithConsent } from "@/lib/compliance/recording-consent";
import { buildCampaignPrompt, type CampaignType, type LeadForPrompt } from "@/lib/campaigns/prompt";
import { getVoiceProvider } from "@/lib/voice";
import { DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";

export async function executeLeadOutboundCall(
  workspaceId: string,
  leadId: string,
  options?: { campaignType?: CampaignType; campaignPromptOptions?: Parameters<typeof buildCampaignPrompt>[2] }
): Promise<{ ok: true; call_session_id: string } | { ok: false; error: string }> {
  const db = getDb();

  // Hard gate: disable outbound calling once the trial is fully expired.
  // - `trial_expired` grace window should still allow calls.
  // - `expired` / `trial_ended` should block outbound calling.
  const { data: ws } = await db
    .from("workspaces")
    .select("id, status, billing_status")
    .eq("id", workspaceId)
    .maybeSingle();

  const workspace = ws as { id?: string; status?: string | null; billing_status?: string | null } | null;
  if (workspace?.status === "expired" || workspace?.billing_status === "trial_ended") {
    return { ok: false, error: "Workspace trial expired" };
  }

  const orchestrationProvider = (process.env.VOICE_PROVIDER ?? "recall") as
    | "vapi"
    | "pipecat"
    | "recall"
    | "elevenlabs"
    | "custom";

  const { data: lead } = await db
    .from("leads")
    .select("id, phone, name, company, metadata")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead not found" };

  const leadRow = lead as { phone?: string | null; name?: string | null; company?: string | null; metadata?: { service_requested?: string; notes?: string } | null };
  const phone = leadRow.phone;
  if (!phone || String(phone).replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Lead has no valid phone number" };
  }

  // Outbound calling config differs by orchestration provider.
  if (orchestrationProvider === "pipecat") {
    const required = [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER",
      "PIPECAT_SERVER_URL",
    ] as const;
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      return {
        ok: false,
        error: `Outbound calling not configured (pipecat): missing ${missing.join(", ")}`,
      };
    }
  }

  const [ctxRes, agentRowsRes, wsConsentRes] = await Promise.all([
    db.from("workspace_business_context").select("business_name, offer_summary, business_hours, faq").eq("workspace_id", workspaceId).maybeSingle(),
    db
      .from("agents")
      .select("id, name, greeting, knowledge_base, rules, purpose")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("workspaces")
      .select("recording_consent_mode, recording_consent_announcement, recording_pause_on_sensitive")
      .eq("id", workspaceId)
      .maybeSingle(),
  ]);
  const ctx = ctxRes.data as { business_name?: string; offer_summary?: string; business_hours?: Record<string, unknown>; faq?: Array<{ q?: string; a?: string }> } | null;
  const rows = (agentRowsRes.data ?? []) as Array<{
    id: string;
    name?: string;
    greeting?: string;
    knowledge_base?: Record<string, unknown>;
    rules?: { learnedBehaviors?: string[] };
    purpose?: string;
  }>;
  const agent =
    rows.find((r) => r.purpose === "outbound") ??
    rows.find((r) => r.purpose === "both") ??
    rows[0] ??
    null;
  if (!agent) return { ok: false, error: "No agent configured for workspace" };

  const business_name = ctx?.business_name ?? "The business";
  const offer_summary = ctx?.offer_summary ?? "";
  const business_hours = (ctx?.business_hours ?? {}) as Record<string, { start: string; end: string } | null>;
  const faq = ctx?.faq ?? [];
  const agent_name = agent.name ?? "Sarah";
  const kb = agent.knowledge_base ?? {};
  const services = typeof kb.services === "string" ? kb.services : undefined;
  const emergencies_after_hours = typeof kb.emergencies_after_hours === "string" ? kb.emergencies_after_hours : undefined;
  const appointment_handling = typeof kb.appointment_handling === "string" ? kb.appointment_handling : undefined;
  const faq_extra = typeof kb.faq_extra === "string" ? kb.faq_extra : undefined;
  const rules = (agent.rules ?? {}) as { learnedBehaviors?: string[] };

  const baseSystemPrompt = compileSystemPrompt({
    business_name,
    offer_summary,
    business_hours,
    faq,
    agent_name,
    greeting: agent.greeting,
    services,
    emergencies_after_hours,
    appointment_handling,
    faq_extra,
    primary_goal: typeof kb.primaryGoal === "string" ? kb.primaryGoal : undefined,
    business_context: typeof kb.businessContext === "string" ? kb.businessContext : undefined,
    target_audience: typeof kb.targetAudience === "string" ? kb.targetAudience : undefined,
    assertiveness: typeof kb.assertiveness === "number" ? kb.assertiveness : undefined,
    when_hesitation: typeof kb.whenHesitation === "string" ? kb.whenHesitation : undefined,
    when_think_about_it: typeof kb.whenThinkAboutIt === "string" ? kb.whenThinkAboutIt : undefined,
    when_pricing: typeof kb.whenPricing === "string" ? kb.whenPricing : undefined,
    when_competitor: typeof kb.whenCompetitor === "string" ? kb.whenCompetitor : undefined,
    learned_behaviors: Array.isArray(rules.learnedBehaviors) ? rules.learnedBehaviors : undefined,
  });

  const leadName = leadRow.name?.trim() || "there";
  const serviceRequested = leadRow.metadata?.service_requested?.trim() || leadRow.company?.trim() || "your services";
  const notes = leadRow.metadata?.notes?.trim() || "";
  const leadForPrompt: LeadForPrompt = {
    name: leadRow.name,
    phone: leadRow.phone,
    company: leadRow.company,
    metadata: leadRow.metadata,
  };
  const campaignType = options?.campaignType;
  const outboundAddition =
    campaignType != null
      ? `
OUTBOUND CALL CONTEXT:
You are making an outbound call to ${leadName}.
${buildCampaignPrompt(campaignType, leadForPrompt, options?.campaignPromptOptions)}

YOUR OPENER:
Start with a brief, natural opener. Then work toward the campaign goal above. Never be pushy.
`
      : `

OUTBOUND CALL CONTEXT:
You are making an outbound call to ${leadName}.
They previously expressed interest in: ${serviceRequested}.
${notes ? `Notes: ${notes}` : ""}

YOUR OPENER:
Start with a brief, natural opener such as: "Hi ${leadName}, this is calling from ${business_name}. You reached out about ${serviceRequested} and I wanted to follow up. Do you have a quick moment?"

YOUR GOAL:
- Re-engage them, answer questions, try to book an appointment or next step.
- If not interested, thank them and end politely. Never be pushy.
`;
  const systemPrompt = baseSystemPrompt + outboundAddition;
  const outboundFirstMessageBase = `Hi ${leadName}, this is calling from ${business_name}. You reached out about ${serviceRequested} and I wanted to follow up. Do you have a quick moment?`;

  const consentRow = wsConsentRes.data as {
    recording_consent_mode?: string;
    recording_consent_announcement?: string | null;
    recording_pause_on_sensitive?: boolean;
  } | null;
  const recordingConsentSettings =
    consentRow?.recording_consent_mode != null
      ? {
          mode: consentRow.recording_consent_mode as "one_party" | "two_party" | "none",
          announcementText: consentRow.recording_consent_announcement ?? null,
          pauseOnSensitive: consentRow.recording_pause_on_sensitive ?? false,
        }
      : null;
  const _outboundFirstMessage = buildFirstMessageWithConsent(outboundFirstMessageBase, recordingConsentSettings);

  const voicemailBehavior = (agent.knowledge_base?.voicemailBehavior === "hangup" || agent.knowledge_base?.voicemailBehavior === "sms")
    ? agent.knowledge_base.voicemailBehavior
    : "leave";
  const voicemailMessage = typeof agent.knowledge_base?.voicemailMessage === "string" ? agent.knowledge_base.voicemailMessage : "";
  const { voicemailDetection, voicemailMessage: vmMessage } = getVoicemailConfigForBehavior(voicemailBehavior, voicemailMessage);

  const voice = getVoiceProvider();

  let assistantId: string;
  try {
    const { assistantId: createdId } = await voice.createAssistant({
      name: `${agent_name} – outbound ${leadId.slice(0, 8)}`,
      systemPrompt,
      voiceId: DEFAULT_VOICE_ID,
      voiceProvider: "deepgram-aura",
      language: "en",
      tools: [],
      maxDuration: 600,
      silenceTimeout: 30,
      backgroundDenoising: true,
      metadata: {
        workspace_id: workspaceId,
        voicemailDetection: voicemailDetection ? JSON.stringify(voicemailDetection) : "",
        voicemailMessage: vmMessage ?? "",
      },
    });
    assistantId = createdId;
  } catch (assistantErr) {
    console.error("[outbound] Failed to create voice assistant:", assistantErr instanceof Error ? assistantErr.message : assistantErr);
    return { ok: false, error: "Failed to create voice assistant for outbound call" };
  }

  const { data: sessionRow, error: insertErr } = await db
    .from("call_sessions")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      provider: orchestrationProvider,
      call_started_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (insertErr || !sessionRow) {
    return { ok: false, error: "Failed to create call session" };
  }
  const callSessionId = (sessionRow as { id: string }).id;

  const customerNumber = String(phone).trim();
  const e164 = /^\+?\d{10,15}$/.test(customerNumber) ? customerNumber : customerNumber.replace(/\D/g, "").length === 10 ? `+1${customerNumber.replace(/\D/g, "")}` : customerNumber.replace(/\D/g, "");

  try {
    const result = await voice.createOutboundCall({
      assistantId,
      phoneNumber: e164 || customerNumber,
      metadata: {
        workspace_id: workspaceId,
        call_session_id: callSessionId,
        lead_id: leadId,
      },
    });

    // Ensure webhook matching: backend voice webhook uses `call_sessions.external_meeting_id = payload.call_sid`.
    if (result.callId) {
      await db
        .from("call_sessions")
        .update({ external_meeting_id: result.callId })
        .eq("id", callSessionId);
    }
  } catch (callErr) {
    console.error("[outbound] Outbound call failed:", callErr instanceof Error ? callErr.message : callErr);
    await db.from("call_sessions").update({ call_ended_at: new Date().toISOString() }).eq("id", callSessionId);
    return { ok: false, error: "Outbound call failed" };
  }

  return { ok: true, call_session_id: callSessionId };
}
