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
import crypto from "crypto";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";

const FALLBACK_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Thanks for calling. We're not able to connect right now, but your call is important to us. Please leave your name and number after the beep and we'll get back to you shortly.</Say><Record maxLength="120" transcribe="true" action="/api/webhooks/twilio/recording" method="POST"/></Response>`;

function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;

  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");
  const data = url + sorted;
  const expected = crypto.createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Try multiple URL variants for signature verification.
 * Twilio may sign the request with the exact URL it was given, but Vercel may
 * serve it at a slightly different URL (trailing slash, port stripping, etc).
 */
function verifyTwilioSignatureFlexible(params: Record<string, string>, signature: string): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const variants = [
    `${appUrl}/api/webhooks/twilio/voice`,
    `${appUrl}/api/webhooks/twilio/voice/`,
    // In case Vercel forwards with the deployment URL instead
    appUrl.replace("https://www.", "https://") + "/api/webhooks/twilio/voice",
  ];
  return variants.some((url) => verifyTwilioSignature(url, params, signature));
}

export async function POST(req: NextRequest) {
  // No CSRF check — this endpoint receives external webhooks from Twilio.
  // Security is enforced via HMAC signature verification below.

  let form: Record<string, string>;
  try {
    const text = await req.text();
    const entries = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
    form = entries;

    const sig = req.headers.get("x-twilio-signature");
    const hasToken = Boolean(process.env.TWILIO_AUTH_TOKEN);
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice`;

    if (process.env.NODE_ENV === "production") {
      // In production we require both a token and a valid signature.
      if (!hasToken || !sig || !verifyTwilioSignatureFlexible(entries, sig)) {
        log("warn", "twilio-voice.signature-verification-failed", {
          hasToken,
          hasSig: !!sig,
          url,
          callSid: entries.CallSid ?? "unknown",
        });
        return new NextResponse("Invalid signature", { status: 401 });
      }
    } else if (sig && hasToken) {
      // In non-production, verify when signature is present but don't require it
      if (!verifyTwilioSignatureFlexible(entries, sig)) {
        return new NextResponse("Invalid signature", { status: 403 });
      }
    }
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }
  const from = form.From ?? form.Caller;
  const to = form.To ?? form.Called;
  const callSid = form.CallSid;

  const db = getDb();

  // 1. Try matching the TO number (inbound call to our number)
  const { data: phoneConfig } = await db
    .from("phone_configs")
    .select("workspace_id, proxy_number")
    .or(`proxy_number.eq.${to?.replace(/[\s()-]/g, "")},proxy_number.eq.${to},proxy_number.eq.+${to?.replace(/\D/g, "")}`)
    .eq("status", "active")
    .maybeSingle();

  let workspaceId = (phoneConfig as { workspace_id?: string } | null)?.workspace_id ?? null;

  // 2. For outbound calls (e.g. demo calls), our number is in FROM — try that
  if (!workspaceId && from) {
    const { data: fromConfig } = await db
      .from("phone_configs")
      .select("workspace_id, proxy_number")
      .or(`proxy_number.eq.${from?.replace(/[\s()-]/g, "")},proxy_number.eq.${from},proxy_number.eq.+${from?.replace(/\D/g, "")}`)
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
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">We're sorry, this number is not currently in service. Please check the number and try again.</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }

  let callSessionId: string | null = null;

  if (callSid) {
    try {
      const { data: existing } = await db.from("call_sessions").select("id").eq("workspace_id", workspaceId).eq("external_meeting_id", callSid).maybeSingle();
      if (!existing) {
        let leadId: string | null = null;
        const phone = (from ?? "").replace(/\D/g, "");
        if (phone.length >= 10) {
          const { data: lead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).or(`phone.eq.${from},phone.eq.${phone}`).limit(1).maybeSingle();
          leadId = (lead as { id: string } | null)?.id ?? null;
          if (!leadId) {
            const createdResult = await runWithWriteContextAsync("api", async () =>
              db.from("leads").insert({ workspace_id: workspaceId, name: "Inbound caller", phone: from ?? undefined, status: "NEW" }).select("id").maybeSingle()
            ) as { data?: { id: string } | null };
            leadId = createdResult.data?.id ?? null;
          }
        }
        const { data: inserted } = await db.from("call_sessions").insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          external_meeting_id: callSid,
          provider: "twilio",
          call_started_at: new Date().toISOString(),
        }).select("id").maybeSingle();
        if (inserted) callSessionId = (inserted as { id: string }).id;
      } else {
        callSessionId = (existing as { id: string }).id;
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
          return new NextResponse(streamingTwiml, { headers: { "Content-Type": "text/xml" } });
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
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    } catch (callErr) {
      log("error", "twilio-voice.voice-ai-handoff-failed", { error: String(callErr) });
    }
  }

  return new NextResponse(FALLBACK_TWIML, {
    headers: { "Content-Type": "text/xml" },
  });
}
