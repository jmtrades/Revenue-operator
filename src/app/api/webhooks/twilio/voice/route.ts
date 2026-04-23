/**
 * Twilio voice webhook: inbound call to a Revenue Operator number.
 *
 * For DEMO calls (outbound from our Twilio number):
 *   → PRIORITY: Routes to streaming voice server via <Connect><Stream> (sub-800ms latency)
 *   → FALLBACK: Routes to <Say> + <Gather> turn-taking if streaming unavailable
 *   → Uses Claude API via generateDemoResponse() for natural AI sales conversation
 *
 * For INBOUND calls (to a customer's AI agent number):
 *   → Hands off to voice server via handleInboundCall() for streaming AI
 *   → Falls back to Say+Record if voice server unavailable
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { handleInboundCall } from "@/lib/voice/call-flow";
import { getRandomGreeting } from "@/lib/voice/demo-agent";
import { createStreamingDemoCall, isStreamingAvailable, shouldUseStreaming } from "@/lib/voice/demo-streaming";
import { getReturningCallerGreeting } from "@/lib/voice/context-carryover";
import { log } from "@/lib/logger";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";
import { normalizePhone } from "@/lib/security/phone";
import {
  verifyTwilioRequest,
  buildTwilioCandidateUrls,
  TwilioSignatureConfigError,
} from "@/lib/security/twilio-signature";
import { injectConsentDisclosure } from "@/lib/voice/consent-states";

// Phase 78 / Task 7.1: FALLBACK_TWIML ends in <Record/>, so we must disclose
// BEFORE Twilio starts recording or we ship wiretap liability in every
// two-party-consent state. The disclosure carries the consent-states module's
// marker attribute so a second pass through `injectConsentDisclosure` is a
// no-op and nothing double-speaks on the line.
const FALLBACK_TWIML = injectConsentDisclosure(
  `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thanks for calling. Please hold while we connect you.</Say><Pause length="2"/><Say voice="alice">If you need to speak to someone, please leave your name and number after the beep.</Say><Record maxLength="90" transcribe="true"/></Response>`,
);

export async function POST(req: NextRequest) {
  // No CSRF check — this endpoint receives external webhooks from Twilio.
  // Security is enforced via HMAC signature verification below.

  let form: Record<string, string>;
  try {
    const text = await req.text();
    const entries = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
    form = entries;

    // Phase 78/Phase 4 (P0-4): always-on Twilio signature verification — no
    // NODE_ENV gate, no fail-open fallback. `verifyTwilioRequest` throws
    // `TwilioSignatureConfigError` if `TWILIO_AUTH_TOKEN` is unset (caught
    // below and returned as 500) so preview/staging cannot silently accept
    // unsigned voice webhooks.
    const sig = req.headers.get("x-twilio-signature");
    if (!verifyTwilioRequest(buildTwilioCandidateUrls(req), entries, sig)) {
      log("warn", "twilio-voice.signature-verification-failed", {
        hasSig: !!sig,
        callSid: entries.CallSid ?? "unknown",
      });
      return new NextResponse("Invalid signature", { status: 403 });
    }
  } catch (err) {
    if (err instanceof TwilioSignatureConfigError) {
      log("error", "twilio-voice.signature-config-error", { message: err.message });
      return new NextResponse("Server misconfigured", { status: 500 });
    }
    return new NextResponse("Bad Request", { status: 400 });
  }
  const from = form.From ?? form.Caller;
  const to = form.To ?? form.Called;
  const callSid = form.CallSid;

  // Phase 78/Phase 3 — normalize phone inputs before interpolating into
  // PostgREST .or() filters. normalizePhone rejects anything that can't be
  // coerced to strict E.164, which defuses the D7-class injection vector
  // where a comma/dot/paren in `From` or `To` grafts an extra OR clause.
  const toE164 = normalizePhone(to);
  const fromE164 = normalizePhone(from);

  const db = getDb();

  // 1. Try matching the TO number (inbound call to our number).
  //    Both variants below are derived from the validated E.164 string and
  //    contain only `+` and digits — safe to interpolate.
  let workspaceId: string | null = null;
  if (toE164) {
    const toDigits = toE164.slice(1); // strip leading "+"
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("workspace_id, proxy_number")
      .or(`proxy_number.eq.${toE164},proxy_number.eq.${toDigits}`)
      .eq("status", "active")
      .maybeSingle();
    workspaceId = (phoneConfig as { workspace_id?: string } | null)?.workspace_id ?? null;
  }

  // 2. For outbound calls (e.g. demo calls), our number is in FROM — try that
  if (!workspaceId && fromE164) {
    const fromDigits = fromE164.slice(1);
    const { data: fromConfig } = await db
      .from("phone_configs")
      .select("workspace_id, proxy_number")
      .or(`proxy_number.eq.${fromE164},proxy_number.eq.${fromDigits}`)
      .eq("status", "active")
      .maybeSingle();
    workspaceId = (fromConfig as { workspace_id?: string } | null)?.workspace_id ?? null;
  }

  // 3. Check if there's already a call_session for this CallSid (e.g. demo call fallback from Telnyx)
  if (!workspaceId && callSid) {
    const { data: existingSession } = await db
      .from("call_sessions")
      .select("workspace_id")
      .eq("external_meeting_id", callSid)
      .maybeSingle();
    workspaceId = (existingSession as { workspace_id?: string } | null)?.workspace_id ?? null;
  }

  // 4. Final fallback: check DEMO_WORKSPACE_ID if the FROM matches our Twilio number
  if (!workspaceId && from) {
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    if (twilioNumber && from.replace(/\D/g, "") === twilioNumber.replace(/\D/g, "")) {
      workspaceId = process.env.DEMO_WORKSPACE_ID ?? null;
    }
  }

  // Reject calls to unmapped numbers — no workspace means we can't serve this caller
  if (!workspaceId) {
    log("error", "twilio-voice.no-workspace-found", { to, from });
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">We're sorry, this number is not currently in service. Please check the number and try again.</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }

  let callSessionId: string | null = null;

  if (callSid) {
    try {
      // Idempotency: Twilio may retry the same webhook (network blip, 5xx on our
      // side, etc.). Check for an existing row first — if found, reuse its id
      // and skip the whole lead/insert pipeline so we don't double-charge or
      // create duplicate call_sessions for one physical phone call.
      const { data: existing } = await db.from("call_sessions").select("id").eq("workspace_id", workspaceId).eq("external_meeting_id", callSid).maybeSingle();
      if (existing) {
        callSessionId = (existing as { id: string }).id;
        log("info", "twilio-voice.duplicate-webhook-dedup", { callSid, sessionId: callSessionId });
      } else {
        let leadId: string | null = null;
        // Phase 78/Phase 3 — use the validated E.164 `fromE164` (already
        // normalized at the top of the handler) to produce safe filter
        // variants. Both `fromE164` and `fromDigits` contain only `+` / digits.
        if (fromE164) {
          const fromDigits = fromE164.slice(1);
          const { data: lead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).or(`phone.eq.${fromE164},phone.eq.${fromDigits}`).limit(1).maybeSingle();
          leadId = (lead as { id: string } | null)?.id ?? null;
          if (!leadId) {
            const createdResult = await runWithWriteContextAsync("api", async () =>
              db.from("leads").insert({ workspace_id: workspaceId, name: "Inbound caller", phone: from ?? undefined, state: "NEW" }).select("id").maybeSingle()
            ) as { data?: { id: string } | null };
            leadId = createdResult.data?.id ?? null;
          }
        }
        const { data: inserted, error: insertErr } = await db.from("call_sessions").insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          external_meeting_id: callSid,
          provider: "twilio",
          call_started_at: new Date().toISOString(),
        }).select("id").maybeSingle();
        if (inserted) {
          callSessionId = (inserted as { id: string }).id;
        } else if (insertErr) {
          // Concurrent webhook delivery may have won the race. Re-read to pick
          // up the row the other request inserted, so we don't silently drop
          // callSessionId and skip downstream voice-AI handoff.
          log("warn", "twilio-voice.insert-race-refetch", { callSid, err: insertErr.message ?? String(insertErr) });
          const { data: reread } = await db.from("call_sessions").select("id").eq("workspace_id", workspaceId).eq("external_meeting_id", callSid).maybeSingle();
          if (reread) callSessionId = (reread as { id: string }).id;
        }
      }
    } catch (sessionErr) {
      log("error", "twilio-voice.call-session-creation-failed", { error: String(sessionErr) });
    }
  }

  // ── Detect demo calls: outbound calls FROM our Twilio number ──
  const isDemoCall = (() => {
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioNumber || !from) return false;
    // If FROM is our Twilio number, this is an outbound demo call
    return from.replace(/\D/g, "") === twilioNumber.replace(/\D/g, "");
  })();

  // Also check if the call_session was marked as a demo in metadata
  const isDemoViaSession = await (async () => {
    if (!callSessionId) return false;
    try {
      const { data: sess } = await db
        .from("call_sessions")
        .select("metadata")
        .eq("id", callSessionId)
        .maybeSingle();
      const meta = (sess as { metadata?: Record<string, unknown> | null })
        ?.metadata as Record<string, unknown> | null;
      return meta?.is_demo === true || meta?.demo_call === true;
    } catch {
      return false;
    }
  })();

  const shouldUseDemoFlow = isDemoCall || isDemoViaSession;

  if (shouldUseDemoFlow && callSessionId) {
    // ── DEMO FLOW ──
    // PRIORITY: Try streaming voice server for sub-800ms latency
    // FALLBACK: Use <Say> + <Gather> TwiML turn-taking
    log("info", "twilio-voice.demo-call-detected", { callSid, streaming: isStreamingAvailable() });

    const DEMO_WS = process.env.DEMO_WORKSPACE_ID ?? "";
    const callerPhone = (form.To ?? form.Called) || "";

    // A/B test: route to streaming or TwiML based on session hash
    const useStreaming = shouldUseStreaming(callSessionId);
    log("info", "twilio-voice.ab-routing", { variant: useStreaming ? "streaming" : "twiml", session: callSessionId });

    if (useStreaming && DEMO_WS) {
      try {
        const streamingTwiml = await createStreamingDemoCall(callSessionId, callerPhone, DEMO_WS);
        if (streamingTwiml) {
          log("info", "twilio-voice.demo-routed-to-streaming", { session: callSessionId });
          // Phase 78 / Task 7.1: streaming TwiML typically wraps a
          // <Connect><Stream> — treated as recording — so disclose first.
          return new NextResponse(injectConsentDisclosure(streamingTwiml), { headers: { "Content-Type": "text/xml" } });
        }
      } catch (streamErr) {
        log("warn", "twilio-voice.streaming-fallback", { error: String(streamErr) });
      }
    }

    // Fallback: TwiML <Say> + <Gather> turn-taking
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";
    const demoTurnUrl = `${appUrl}/api/webhooks/twilio/voice/demo-turn`;

    // Try personalized returning-caller greeting, fall back to random
    let greeting: string;
    try {
      const returningGreeting = DEMO_WS && callerPhone
        ? await getReturningCallerGreeting(DEMO_WS, callerPhone)
        : null;
      greeting = returningGreeting ?? getRandomGreeting();
    } catch {
      greeting = getRandomGreeting();
    }

    // Mark session as demo in metadata
    try {
      const { data: currentSession } = await db
        .from("call_sessions")
        .select("metadata")
        .eq("id", callSessionId)
        .maybeSingle();
      const existingMeta = ((currentSession as { metadata?: Record<string, unknown> | null })?.metadata ?? {}) as Record<string, unknown>;
      await db
        .from("call_sessions")
        .update({
          metadata: {
            ...existingMeta,
            is_demo: true,
            streaming: false,
            ab_variant: "twiml",
            demo_started_at: new Date().toISOString(),
            demo_history: [{ role: "assistant", content: greeting }],
          },
        })
        .eq("id", callSessionId);
    } catch (metaErr) {
      log("warn", "twilio-voice.failed-to-save-demo-metadata", { error: String(metaErr) });
    }

    // Return TwiML: speak the greeting with SSML prosody, then gather caller's speech
    const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const greetingSsml = escXml(greeting)
      .replace(/\.\.\./g, '<break time="350ms"/>')
      .replace(/\s*—\s*/g, ' <break time="200ms"/> ');
    const twiml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<Response>",
      `  <Gather input="speech" speechTimeout="3" speechModel="phone_call" enhanced="true" language="en-US" action="${escXml(demoTurnUrl)}?session=${callSessionId}" method="POST">`,
      `    <Say voice="Polly.Joanna-Neural"><speak><prosody rate="98%" pitch="-2%">${greetingSsml}</prosody></speak></Say>`,
      "  </Gather>",
      `  <Pause length="1"/>`,
      `  <Redirect>${escXml(demoTurnUrl)}?session=${callSessionId}&amp;silence=1</Redirect>`,
      "</Response>",
    ].join("\n");

    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  }

  // ── STANDARD INBOUND FLOW: Voice server streaming AI ──
  if (workspaceId && callSessionId && from) {
    try {
      const twiml = await handleInboundCall({
        workspaceId,
        callSid,
        callerPhone: from,
      });
      // Phase 78 / Task 7.1: inbound handoff returns either a <Connect><Stream>
      // (streaming AI) or a <Record> voicemail fallback. Both constitute
      // recording. `injectConsentDisclosure` is idempotent, so this is safe
      // even when `handleInboundCall` has already applied its own disclosure.
      return new NextResponse(injectConsentDisclosure(twiml), { headers: { "Content-Type": "text/xml" } });
    } catch (callErr) {
      log("error", "twilio-voice.voice-ai-handoff-failed", { error: String(callErr) });
    }
  }

  return new NextResponse(FALLBACK_TWIML, {
    headers: { "Content-Type": "text/xml" },
  });
}
