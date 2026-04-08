/**
 * Execute an outbound call to a lead. Used by POST /api/outbound/call and by speed-to-lead cron.
 * No auth — caller must ensure workspaceId and leadId are authorized.
 */

import { getDb } from "@/lib/db/queries";
import { compileSystemPrompt } from "@/lib/business-brain";
import { getVoicemailConfigForBehavior } from "@/lib/voice/voicemail-detection";
import { buildFirstMessageWithConsent } from "@/lib/compliance/recording-consent";
import { buildCampaignPrompt, type CampaignType, type LeadForPrompt } from "@/lib/campaigns/prompt";
import { getVoiceProvider } from "@/lib/voice";
import { resolveVoiceForCall } from "@/lib/voice/resolve-voice";
import { DEFAULT_RECALL_VOICE_ID as DEFAULT_VOICE_ID } from "@/lib/constants/recall-voices";
import { normalizePhoneE164 } from "@/lib/phone/normalize";
import { log } from "@/lib/logger";

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
  const blockedStatuses = new Set(["trial_ended", "cancelled", "payment_failed"]);
  if (workspace?.status === "expired" || blockedStatuses.has(workspace?.billing_status ?? "")) {
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
    .select("id, phone, name, company, state, qualification_score, metadata")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead not found" };

  const leadRow = lead as {
    phone?: string | null;
    name?: string | null;
    company?: string | null;
    state?: string | null;
    qualification_score?: number | null;
    metadata?: { service_requested?: string; notes?: string; tags?: string[] } | null;
  };
  const phone = leadRow.phone;
  if (!phone || String(phone).replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Lead has no valid phone number" };
  }

  // Safety guard: per-lead contact frequency caps
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Check outbound calls in last 24 hours
  const { data: callData, error: _callError } = await db
    .from("call_sessions")
    .select("id")
    .eq("lead_id", leadId)
    .gte("call_started_at", twentyFourHoursAgo);
  const callCount = (callData?.length ?? 0);

  // Check outbound SMS messages in last 24 hours
  const { data: smsData, error: _smsError } = await db
    .from("outbound_messages")
    .select("id")
    .eq("lead_id", leadId)
    .gte("created_at", twentyFourHoursAgo);
  const smsCount = (smsData?.length ?? 0);

  // Enforce contact frequency caps
  if (callCount >= 4) {
    log("warn", "[outbound-safety] Lead reached call frequency cap", { callCount, cap: 4 });
    return { ok: false, error: "Lead has reached maximum call frequency for 24-hour period" };
  }

  const totalTouches = callCount + smsCount;
  if (totalTouches > 6) {
    log("warn", "[outbound-safety] Lead exceeded total contact limit", { callCount, smsCount, total: totalTouches, cap: 6 });
    return { ok: false, error: "Lead has exceeded maximum contact frequency for 24-hour period" };
  }

  // COMPLIANCE: Check opt-out status before calling
  try {
    const { isOptedOut } = await import("@/lib/lead-opt-out");
    const phoneNormalized = String(phone).replace(/\D/g, "");
    const optedOut = await isOptedOut(workspaceId, phoneNormalized) || await isOptedOut(workspaceId, phone);
    // Also check the leads table opt_out flag
    const { data: leadOptData } = await db
      .from("leads")
      .select("opt_out")
      .eq("id", leadId)
      .maybeSingle();
    if (optedOut || (leadOptData as { opt_out?: boolean } | null)?.opt_out === true) {
      log("warn", "[outbound-compliance] Lead is opted out — blocking call");
      return { ok: false, error: "Lead has opted out of contact" };
    }
  } catch (optErr) {
    const errMsg = optErr instanceof Error ? optErr.message : String(optErr);
    // Only fail open if the table doesn't exist yet (e.g. new workspace)
    if (errMsg.includes("does not exist") || errMsg.includes("relation") || errMsg.includes("42P01")) {
      log("warn", "[outbound-compliance] Opt-out table not found — skipping check", { error: errMsg });
    } else {
      // Real error (DB down, network issue, etc.) — fail closed for compliance safety
      log("error", "[outbound-compliance] Opt-out check failed — blocking call for safety", { error: errMsg });
      return { ok: false, error: "Unable to verify opt-out status — call blocked for compliance" };
    }
  }

  // COMPLIANCE: TCPA Quiet Hours enforcement — don't call outside 8am-9pm in recipient's timezone
  try {
    const { isTCPACompliant } = await import("@/lib/compliance/tcpa-quiet-hours");
    if (!isTCPACompliant(phone)) {
      log("warn", "[outbound-compliance] TCPA quiet hours violation — call blocked");
      return { ok: false, error: "blocked_tcpa_hours" };
    }
  } catch (tcpaErr) {
    // If TCPA check fails, fail closed for compliance safety
    log("error", "[outbound-compliance] TCPA compliance check failed — blocking call for safety", { error: tcpaErr instanceof Error ? tcpaErr.message : String(tcpaErr) });
    return { ok: false, error: "TCPA compliance check failed — call blocked for safety" };
  }

  // COMPLIANCE: Business hours enforcement — don't call outside configured hours
  try {
    const { data: bizCtx } = await db
      .from("workspace_business_context")
      .select("business_hours, timezone")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const ctx = bizCtx as { business_hours?: Record<string, { start: string; end: string }> | null; timezone?: string | null } | null;
    if (ctx?.business_hours && Object.keys(ctx.business_hours).length > 0) {
      const tz = ctx.timezone ?? "America/New_York";
      const localNow = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const today = dayNames[localNow.getDay()];
      const todayHours = ctx.business_hours[today];
      if (todayHours) {
        const startParts = typeof todayHours.start === "string" ? todayHours.start.split(":").map(Number) : [];
        const endParts = typeof todayHours.end === "string" ? todayHours.end.split(":").map(Number) : [];
        const startH = isNaN(startParts[0]) ? 0 : startParts[0];
        const startM = isNaN(startParts[1]) ? 0 : startParts[1];
        const endH = isNaN(endParts[0]) ? 23 : endParts[0];
        const endM = isNaN(endParts[1]) ? 59 : endParts[1];
        const currentMinutes = localNow.getHours() * 60 + localNow.getMinutes();
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
          log("warn", `[outbound-hours] Outside business hours (${todayHours.start}-${todayHours.end} ${tz})`);
          return { ok: false, error: "Outside business hours — call will be scheduled for next available window" };
        }
      }
      // If no hours configured for today (e.g. weekend), allow the call — only enforce when hours ARE set
    }
    // If no business hours configured at all, allow calls (user hasn't set hours yet)
  } catch (bizErr) {
    // If business context doesn't exist, continue but log
    log("warn", "[outbound-hours] Business context check failed", { error: bizErr instanceof Error ? bizErr.message : String(bizErr) });
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
    state: (leadRow.state as any) || null,
    score: leadRow.qualification_score ?? null,
    tags: leadRow.metadata?.tags ?? null,
    notes: notes || null,
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
  const outboundFirstMessage = buildFirstMessageWithConsent(outboundFirstMessageBase, recordingConsentSettings);

  const voicemailBehavior = (agent.knowledge_base?.voicemailBehavior === "hangup" || agent.knowledge_base?.voicemailBehavior === "sms")
    ? agent.knowledge_base.voicemailBehavior
    : "leave";
  const voicemailMessage = typeof agent.knowledge_base?.voicemailMessage === "string" ? agent.knowledge_base.voicemailMessage : "";
  const { voicemailDetection, voicemailMessage: vmMessage } = getVoicemailConfigForBehavior(voicemailBehavior, voicemailMessage);

  // Check minute limit before initiating call
  try {
    const { BILLING_PLANS } = await import("@/lib/billing-plans");
    const { data: wsBilling } = await db
      .from("workspaces")
      .select("billing_tier")
      .eq("id", workspaceId)
      .maybeSingle();

    const billingTier = (wsBilling as { billing_tier?: string | null } | null)?.billing_tier as keyof typeof BILLING_PLANS | null;
    if (billingTier && billingTier in BILLING_PLANS) {
      const plan = BILLING_PLANS[billingTier];
      const includedMinutes = plan.includedMinutes;

      // Get current month's usage using DB-side aggregate (avoids fetching all rows)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: usageRow } = await db
        .rpc("sum_call_duration_seconds", {
          p_workspace_id: workspaceId,
          p_since: monthStart,
        })
        .maybeSingle();

      // Fallback: if the RPC doesn't exist, use a bounded query
      let usedMinutes = 0;
      if (usageRow && typeof (usageRow as { total_seconds?: number }).total_seconds === "number") {
        usedMinutes = Math.ceil((usageRow as { total_seconds: number }).total_seconds / 60);
      } else {
        // Fallback: fetch with limit to prevent unbounded reads
        const { data: callSessions } = await db
          .from("call_sessions")
          .select("duration_seconds")
          .eq("workspace_id", workspaceId)
          .gte("call_started_at", monthStart)
          .not("duration_seconds", "is", null)
          .limit(5000);

        const usedSeconds = (callSessions ?? []).reduce(
          (sum: number, s: { duration_seconds?: number | null }) => sum + (s.duration_seconds ?? 0),
          0
        );
        usedMinutes = Math.ceil(usedSeconds / 60);
      }

      // Also check bonus minutes from minute pack purchases
      let bonusMinutes = 0;
      try {
        const { data: balanceRow } = await db
          .from("workspace_minute_balance")
          .select("bonus_minutes")
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        bonusMinutes = (balanceRow as { bonus_minutes?: number } | null)?.bonus_minutes ?? 0;
      } catch {
        // Non-critical: if balance table doesn't exist, ignore
      }

      const totalAvailableMinutes = includedMinutes + bonusMinutes;
      if (usedMinutes >= totalAvailableMinutes) {
        return { ok: false, error: "Monthly minute limit reached. Upgrade your plan or purchase additional minutes." };
      }
    }
  } catch (err) {
    // Log but don't block on minute check errors
    log("warn", "[outbound-minute-check] Error checking minute limit", { error: err instanceof Error ? err.message : String(err) });
  }

  const voice = getVoiceProvider();

  // Resolve voice: check A/B test, fall back to workspace active voice, then default
  let resolvedVoice;
  try {
    resolvedVoice = await resolveVoiceForCall(workspaceId);
  } catch (resolveErr) {
    log("warn", "[outbound] Voice resolution failed, using default", { error: resolveErr instanceof Error ? resolveErr.message : String(resolveErr) });
    resolvedVoice = { voiceId: DEFAULT_VOICE_ID };
  }

  let assistantId: string;
  try {
    const { assistantId: createdId } = await voice.createAssistant({
      name: `${agent_name} – outbound ${leadId.slice(0, 8)}`,
      systemPrompt,
      firstMessage: outboundFirstMessage,
      voiceId: resolvedVoice.voiceId,
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
        ...(resolvedVoice.abTestId && { ab_test_id: resolvedVoice.abTestId }),
        ...(resolvedVoice.variant && { ab_test_variant: resolvedVoice.variant }),
      },
    });
    assistantId = createdId;
  } catch (assistantErr) {
    log("error", "[outbound] Failed to create voice assistant", { error: assistantErr instanceof Error ? assistantErr.message : String(assistantErr) });
    return { ok: false, error: "Failed to create voice assistant for outbound call" };
  }

  const customerNumber = String(phone).trim();
  const e164 = normalizePhoneE164(customerNumber);

  // Retry logic with exponential backoff: try up to 3 times (1s, 2s, 4s delays)
  let callResult;
  const retryDelays = [1000, 2000, 4000]; // milliseconds
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await voice.createOutboundCall({
        assistantId,
        phoneNumber: e164 || customerNumber,
        metadata: {
          workspace_id: workspaceId,
          lead_id: leadId,
          // Will add call_session_id after DB insert below
        },
      });
      callResult = result;
      break; // Success
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      log("warn", `[outbound] Attempt ${attempt + 1}/3 failed`, { error: lastErr.message });
      if (attempt < 2) {
        // Sleep before retry
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      }
    }
  }

  if (!callResult) {
    log("error", "[outbound] All 3 retry attempts exhausted for creating outbound call", { error: lastErr?.message });
    return { ok: false, error: "Outbound call failed after retries" };
  }

  // Guard: do not create a call session if the voice provider returned no usable call ID.
  // This prevents orphaned call_sessions that can never be matched to status webhooks.
  const externalMeetingId = callResult.callId && callResult.callId.trim().length > 0 ? callResult.callId.trim() : null;
  if (!externalMeetingId) {
    log("error", "[outbound] Voice provider returned no callId — skipping call_session insert to prevent orphan");
    return { ok: false, error: "Voice provider returned no call identifier" };
  }

  // Now insert call_sessions AFTER the voice call is successfully initiated
  const { data: sessionRow, error: insertErr } = await db
    .from("call_sessions")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      provider: orchestrationProvider,
      call_started_at: new Date().toISOString(),
      external_meeting_id: externalMeetingId,
    })
    .select("id")
    .maybeSingle();

  if (insertErr || !sessionRow) {
    log("error", "[outbound] Failed to create call session after voice call initiated", { error: insertErr?.message });
    return { ok: false, error: "Failed to create call session" };
  }

  const callSessionId = (sessionRow as { id: string }).id;

  return { ok: true, call_session_id: callSessionId };
}
