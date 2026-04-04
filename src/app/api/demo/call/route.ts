/**
 * POST /api/demo/call — Initiate a demo outbound call to a prospect's phone number.
 * Rate-limited to 3 calls per IP per 10 minutes.
 *
 * Enhanced features:
 *  - Smart phone normalization with country code inference
 *  - Lead deduplication (upsert existing leads)
 *  - Source tracking (which page/button triggered the call)
 *  - Better error messages for every failure mode
 *  - Trust-level fallback with callback request
 *
 * Places the call directly via Telnyx Call Control API.
 * When the callee answers, the Telnyx voice webhook handler
 * (/api/webhooks/telnyx/voice) detects the outbound demo call
 * and starts an AI conversation powered by Claude.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createOutboundCall } from "@/lib/telephony/telnyx-voice";
import { log } from "@/lib/logger";
import { encodeDemoState, type DemoCallState, getRandomGreeting } from "@/lib/voice/demo-agent";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";

const demoCallSchema = z.object({
  phone_number: z.string().min(7).max(20),
  source: z.string().max(100).optional(),
  page: z.string().max(500).optional(),
});

/**
 * Normalize a phone number to E.164 format.
 * Supports multiple formats from around the world:
 *  - E.164: +44 7911 123456 → +447911123456
 *  - 00 prefix: 0044 7911 123456 → +447911123456
 *  - Bare US/CA (10 digits): 5551234567 → +15551234567
 *  - US/CA with 1 (11 digits): 15551234567 → +15551234567
 *  - UK mobile with 0 (11 digits starting 07): 07911123456 → +447911123456
 *  - International digits without +: 447911123456 → +447911123456
 *
 * Returns null if the number doesn't look valid.
 */
function normalizeToE164(input: string): string | null {
  // Strip all non-digit characters except leading +
  const hasPlus = input.startsWith("+");
  const digits = input.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) return null;

  // Already has + prefix — trust it (user entered full international format)
  if (hasPlus) return `+${digits}`;

  // International dialing with 00 prefix (common in Europe/Asia)
  if (digits.startsWith("00") && digits.length >= 9) {
    return `+${digits.slice(2)}`;
  }

  // 10-digit bare number — assume US/Canada (+1)
  if (digits.length === 10) return `+1${digits}`;

  // 11 digits starting with 1 — US/Canada with country code
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // UK mobile pattern: 11 digits starting with 07
  if (digits.length === 11 && digits.startsWith("07")) {
    return `+44${digits.slice(1)}`; // Remove leading 0, add +44
  }

  // UK landline pattern: 11 digits starting with 01 or 02
  if (digits.length === 11 && (digits.startsWith("01") || digits.startsWith("02"))) {
    return `+44${digits.slice(1)}`;
  }

  // AU mobile: 10 digits starting with 04
  if (digits.length === 10 && digits.startsWith("04")) {
    return `+61${digits.slice(1)}`;
  }

  // Numbers with domestic trunk prefix (leading 0) that don't match patterns above
  if (digits.startsWith("0") && (digits.length === 10 || digits.length === 11)) {
    return null; // ambiguous — require country code
  }

  // Anything else with 7–15 digits — prepend + and let Telnyx validate
  return `+${digits}`;
}

export async function POST(req: NextRequest) {
  /* ── CSRF protection ──────────────────────────────────── */
  const { assertSameOrigin } = await import("@/lib/http/csrf");
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  /* ── Rate limit by IP ────────────────────────────────── */
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`demo-call:${ip}`, 3, 600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "You've already tried a demo call recently. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  /* ── Parse body ──────────────────────────────────────── */
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = demoCallSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request. phone_number is required." }, { status: 400 });
  }

  const phone = parsed.data.phone_number.trim();
  const source = parsed.data.source ?? "website_hero";
  const page = parsed.data.page ?? "";

  // Normalize to E.164 format — support any country
  const e164Phone = normalizeToE164(phone);
  if (!e164Phone) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please include your country code (e.g. +1 for US, +44 for UK). Example: +1 555 123 4567",
      },
      { status: 400 },
    );
  }

  /* ── Verify Telnyx credentials are available ─────────── */
  if (!process.env.TELNYX_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Demo calling is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  const connectionId = process.env.TELNYX_CONNECTION_ID;
  if (!connectionId) {
    log("error", "demo_call.missing_connection_id");
    return NextResponse.json(
      { ok: false, error: "Demo calling is temporarily unavailable." },
      { status: 503 },
    );
  }

  let fromNumber = process.env.TELNYX_PHONE_NUMBER;
  if (!fromNumber) {
    // Fall back to the first active provisioned number in the demo workspace
    try {
      const db = (await import("@/lib/db/queries")).getDb();
      const DEMO_WORKSPACE = process.env.DEMO_WORKSPACE_ID ?? "";

      // Early validation: ensure DEMO_WORKSPACE_ID is configured
      if (!DEMO_WORKSPACE) {
        log("error", "demo_call.demo_workspace_not_configured");
        return NextResponse.json(
          { ok: false, error: "Demo calling is temporarily unavailable. Configuration missing." },
          { status: 503 },
        );
      }

      // Try phone_configs first (primary workspace number)
      const { data: cfg } = await db
        .from("phone_configs")
        .select("proxy_number")
        .eq("workspace_id", DEMO_WORKSPACE)
        .eq("status", "active")
        .maybeSingle();
      fromNumber = (cfg as { proxy_number?: string } | null)?.proxy_number ?? undefined;

      // Fall back to phone_numbers table
      if (!fromNumber) {
        const { data: pn } = await db
          .from("phone_numbers")
          .select("phone_number")
          .eq("workspace_id", DEMO_WORKSPACE)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        fromNumber = (pn as { phone_number?: string } | null)?.phone_number ?? undefined;
      }
    } catch (dbErr) {
      log("warn", "demo_call.db_phone_lookup_failed", { error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
    }
  }
  if (!fromNumber) {
    log("error", "demo_call.missing_phone_number");
    return NextResponse.json(
      { ok: false, error: "Demo calling is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  // Ensure from number is valid E.164 (starts with + and has digits)
  if (!fromNumber.startsWith("+") || fromNumber.replace(/\D/g, "").length < 10) {
    log("error", "demo_call.invalid_from_number", { fromNumber });
    return NextResponse.json(
      { ok: false, error: "Demo calling is temporarily unavailable — configuration issue detected." },
      { status: 503 },
    );
  }

  /* ── Capture / upsert lead (non-blocking) ────────────── */
  try {
    const db = (await import("@/lib/db/queries")).getDb();
    const DEMO_WORKSPACE = process.env.DEMO_WORKSPACE_ID ?? "";

    // Check for existing lead (deduplication)
    const { data: existingLead } = await db
      .from("leads")
      .select("id, metadata")
      .eq("workspace_id", DEMO_WORKSPACE)
      .eq("phone", e164Phone)
      .maybeSingle();

    const now = new Date().toISOString();
    const existingMeta = (existingLead as { id: string; metadata?: Record<string, unknown> } | null)?.metadata ?? {};
    const demoCount = (typeof existingMeta === "object" && existingMeta !== null ? (existingMeta as Record<string, unknown>).demo_call_count : 0) as number || 0;

    if (existingLead) {
      // Update existing lead — track repeat demos
      await db
        .from("leads")
        .update({
          state: "NEW",
          channel: "demo_call",
          metadata: {
            ...existingMeta,
            source,
            page,
            last_demo_at: now,
            demo_call_count: demoCount + 1,
            demo_origin: "call_me_now",
            ip_hash: ip.slice(0, 8),
          },
        })
        .eq("id", (existingLead as { id: string }).id);
    } else {
      // Create new lead
      await runWithWriteContextAsync("api", async () =>
        db.from("leads").insert({
          workspace_id: DEMO_WORKSPACE,
          phone: e164Phone,
          state: "NEW",
          channel: "demo_call",
          metadata: {
            source,
            page,
            captured_at: now,
            demo_origin: "call_me_now",
            demo_call_count: 1,
            ip_hash: ip.slice(0, 8),
          },
        })
      );
    }
  } catch (err) {
    // Non-blocking — don't fail the call if lead capture fails
    log("warn", "demo_call.lead_capture_failed", { error: err instanceof Error ? err.message : String(err) });
  }

  /* ── Place the call via Telnyx Call Control ───────────── */
  // Use WEBHOOK_BASE_URL if set, otherwise fall back to APP_URL.
  // Important: must be the canonical domain (www.recall-touch.com) because
  // non-www redirects via 307 and Telnyx won't follow POST redirects.
  const appUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!appUrl) {
    log("error", "demo_call.app_url_not_configured");
    return NextResponse.json(
      { ok: false, error: "Demo calling is not available. Configuration missing." },
      { status: 503 },
    );
  }

  try {
    // Encode demo mode flag in client_state so webhook can identify demo calls
    const initialDemoState: DemoCallState = {
      mode: "demo",
      history: [],
      turn: 0,
    };
    const clientState = encodeDemoState(initialDemoState);

    const result = await createOutboundCall({
      from: fromNumber,
      to: e164Phone,
      connectionId,
      webhookUrl: `${appUrl}/api/webhooks/telnyx/voice`,
      clientState,
      metadata: {
        type: "demo",
        source,
        demo_call: "true",
      },
    });

    if ("error" in result) {
      log("error", "demo_call.telnyx_error", {
        error: result.error,
        from: fromNumber,
        to: e164Phone,
        connectionId,
        webhookUrl: `${appUrl}/api/webhooks/telnyx/voice`,
      });

      // Detect specific Telnyx error types for better user-facing messages
      const errLower = result.error.toLowerCase();

      // Trust-level / account-level restriction (D60 etc.)
      const isTrustError = errLower.includes("non-verified")
        || errLower.includes("account level")
        || errLower.includes("upgrade")
        || errLower.includes("portal level")
        || errLower.includes("trust")
        || /\bd6[0-9]\b/.test(errLower);

      // Connection / credential misconfiguration — check BEFORE number errors
      // to avoid misclassifying "connection_id is invalid" as a phone number problem
      const isConfigError = errLower.includes("credential")
        || errLower.includes("connection_id")
        || errLower.includes("connection id")
        || (errLower.includes("connection") && (errLower.includes("not found") || errLower.includes("not active") || errLower.includes("invalid")))
        || errLower.includes("not authorized")
        || errLower.includes("forbidden")
        || errLower.includes("api key")
        || errLower.includes("authentication")
        || errLower.includes("unauthorized")
        || (errLower.includes("from") && errLower.includes("not associated"))
        || (errLower.includes("from") && errLower.includes("is invalid"))
        || /telnyx (4(01|03)|401|403)/.test(errLower);

      // Number-specific errors — only match when it's clearly about the TO number
      const isNumberError = errLower.includes("invalid number")
        || errLower.includes("invalid phone")
        || errLower.includes("not a valid e.164")
        || errLower.includes("not a valid phone")
        || errLower.includes("unallocated number")
        || (errLower.includes("'to'") && errLower.includes("invalid"))
        || (errLower.includes("destination") && errLower.includes("number"))
        || /\bd[1-5]\b/.test(errLower);

      // For number-specific errors (invalid TO number), show a clear message
      if (isNumberError && !isTrustError && !isConfigError) {
        return NextResponse.json(
          { ok: false, error: "We couldn't reach that number. Please double-check your phone number and country code." },
          { status: 422 },
        );
      }

      // For ALL other Telnyx errors (trust level, config, transient, etc.),
      // attempt Twilio fallback before falling back to callback request.
      const callbackReason = isTrustError ? "account_trust_level" : isConfigError ? "config_error" : "telnyx_error";
      log("warn", "demo_call.telnyx_failed_trying_twilio", {
        error: result.error,
        to: e164Phone,
        reason: callbackReason,
      });

      // ── Twilio fallback with inline TwiML (session-first approach) ──────────
      // 1. Pre-create the call session in DB → get a real UUID
      // 2. Build TwiML with the real session UUID embedded
      // 3. Place the Twilio call with inline TwiML
      // This eliminates the race condition of creating session after call.
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
      if (twilioSid && twilioToken && twilioFrom) {
        try {
          const db = (await import("@/lib/db/queries")).getDb();
          const DEMO_WORKSPACE = process.env.DEMO_WORKSPACE_ID ?? "";
          const greeting = getRandomGreeting();
          const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
          const demoTurnUrl = `${appUrl}/api/webhooks/twilio/voice/demo-turn`;
          const now = new Date().toISOString();

          // Step 1: Pre-create call session with a placeholder CallSid
          let callSessionId: string | null = null;
          if (DEMO_WORKSPACE) {
            try {
              const { data: inserted } = await db.from("call_sessions").insert({
                workspace_id: DEMO_WORKSPACE,
                external_meeting_id: `pending_${Date.now()}`,
                provider: "twilio",
                call_started_at: now,
                metadata: {
                  mode: "demo",
                  is_demo: true,
                  streaming: false,
                  ab_variant: "twiml",
                  source,
                  provider: "twilio",
                  fallback_from: "telnyx",
                  telnyx_error: result.error,
                  demo_started_at: now,
                  demo_history: [{ role: "assistant", content: greeting }],
                  caller_phone: e164Phone,
                },
              }).select("id").maybeSingle();
              callSessionId = (inserted as { id: string } | null)?.id ?? null;
            } catch (dbErr) {
              log("warn", "demo_call.pre_create_session_failed", { error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
            }
          }

          // Step 2: Build inline TwiML with the REAL session UUID
          // Uses SSML for natural prosody and speechTimeout="3" for snappy turn-taking
          const sessionRef = callSessionId ?? "fallback";
          const greetingSsml = escXml(greeting)
            .replace(/\.\.\./g, '<break time="350ms"/>')
            .replace(/\s*—\s*/g, ' <break time="200ms"/> ');
          const twiml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            "<Response>",
            `<Gather input="speech" speechTimeout="3" speechModel="phone_call" enhanced="true" language="en-US" action="${escXml(demoTurnUrl)}?session=${sessionRef}" method="POST">`,
            `<Say voice="Polly.Joanna-Neural"><speak><prosody rate="98%" pitch="-2%">${greetingSsml}</prosody></speak></Say>`,
            "</Gather>",
            `<Pause length="1"/>`,
            `<Redirect>${escXml(demoTurnUrl)}?session=${sessionRef}&amp;silence=1</Redirect>`,
            "</Response>",
          ].join("");

          // Step 3: Place the Twilio call with inline TwiML
          const twilioAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
          const twilioParams = new URLSearchParams();
          twilioParams.append("From", twilioFrom);
          twilioParams.append("To", e164Phone);
          twilioParams.append("Twiml", twiml);
          twilioParams.append("StatusCallback", `${appUrl}/api/webhooks/twilio/status`);
          twilioParams.append("StatusCallbackEvent", "initiated");
          twilioParams.append("StatusCallbackEvent", "ringing");
          twilioParams.append("StatusCallbackEvent", "answered");
          twilioParams.append("StatusCallbackEvent", "completed");
          twilioParams.append("Timeout", "60");
          const twilioResp = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${twilioAuth}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: twilioParams.toString(),
            }
          );
          if (twilioResp.ok) {
            const twilioData = await twilioResp.json() as { sid?: string };
            log("info", "demo_call.twilio_success", {
              callSid: twilioData.sid,
              sessionId: callSessionId,
              to: e164Phone,
            });

            // Step 4: Update the session with the real Twilio CallSid
            if (callSessionId && twilioData.sid) {
              try {
                await db.from("call_sessions")
                  .update({ external_meeting_id: twilioData.sid })
                  .eq("id", callSessionId);
              } catch (updateErr) {
                log("warn", "demo_call.session_update_failed", { error: updateErr instanceof Error ? updateErr.message : String(updateErr) });
              }
            }

            return NextResponse.json({
              ok: true,
              message: "Calling you now! Pick up to hear your AI operator in action.",
              callId: twilioData.sid,
              provider: "twilio",
              sessionId: callSessionId,
            });
          } else {
            const twilioErr = await twilioResp.text();
            log("error", "demo_call.twilio_fallback_failed", { status: twilioResp.status, error: twilioErr });
          }
        } catch (twilioEx) {
          log("error", "demo_call.twilio_fallback_exception", { error: twilioEx instanceof Error ? twilioEx.message : String(twilioEx) });
        }
      }

      // If Twilio fallback also failed or is not configured, store callback request
      log("warn", "demo_call.callback_fallback", {
        error: result.error,
        to: e164Phone,
        reason: callbackReason,
      });

      try {
        const db = (await import("@/lib/db/queries")).getDb();
        const DEMO_WORKSPACE = process.env.DEMO_WORKSPACE_ID ?? "";
        await db.from("leads").update({
          status: "CALLBACK_REQUESTED",
          metadata: {
            source,
            captured_at: new Date().toISOString(),
            demo_origin: "call_me_now",
            callback_requested: true,
            call_blocked_reason: callbackReason,
          },
        }).eq("phone", e164Phone).eq("workspace_id", DEMO_WORKSPACE);
      } catch (err) {
        log("warn", "demo_call.callback_metadata_update_failed", { error: err instanceof Error ? err.message : String(err) });
      }

      return NextResponse.json({
        ok: true,
        message: "Thanks! We've received your request. Our team will call you shortly to give you a live demo.",
        callback_requested: true,
      });
    }

    log("info", "demo_call.placed", { callId: result.callId, to: e164Phone, source });

    return NextResponse.json({
      ok: true,
      message: "Calling you now! Pick up to hear your AI operator in action.",
      callId: result.callId,
    });
  } catch (err) {
    log("error", "demo_call.unexpected_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "Demo service temporarily unavailable. Please try again shortly." },
      { status: 500 },
    );
  }
}
