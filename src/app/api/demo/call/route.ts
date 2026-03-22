/**
 * POST /api/demo/call — Initiate a demo outbound call to a prospect's phone number.
 * Rate-limited to 2 calls per IP per 10 minutes.
 *
 * Places the call directly via Telnyx Call Control API.
 * When the callee answers, the Telnyx voice webhook handler
 * (/api/webhooks/telnyx/voice) detects the outbound demo call
 * and either streams to the voice server or uses Telnyx TTS as fallback.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createOutboundCall } from "@/lib/telephony/telnyx-voice";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  /* ── Rate limit by IP ────────────────────────────────── */
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`demo-call:${ip}`, 2, 600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "You've already tried a demo call recently. Please wait a few minutes." },
      { status: 429 },
    );
  }

  /* ── Parse body ──────────────────────────────────────── */
  let body: { phone_number?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const phone = body.phone_number?.trim();
  const digitsOnly = phone?.replace(/\D/g, "") ?? "";
  // Allow 10 digits (US) up to 15 digits (international E.164 max)
  if (!phone || digitsOnly.length < 10 || digitsOnly.length > 15) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid phone number with area code." },
      { status: 400 },
    );
  }

  // Normalize to E.164 format
  let e164Phone = digitsOnly;
  if (e164Phone.length === 10) {
    e164Phone = `+1${e164Phone}`; // US number
  } else if (!e164Phone.startsWith("+")) {
    e164Phone = `+${e164Phone}`;
  }

  /* ── Verify Telnyx credentials are available ─────────── */
  if (!process.env.TELNYX_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Demo calling is temporarily unavailable. Start a free trial to test with your own phone." },
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

  const fromNumber = process.env.TELNYX_PHONE_NUMBER;
  if (!fromNumber) {
    log("error", "demo_call.missing_phone_number");
    return NextResponse.json(
      { ok: false, error: "Demo calling is temporarily unavailable." },
      { status: 503 },
    );
  }

  /* ── Capture lead (non-blocking) ─────────────────────── */
  try {
    const db = (await import("@/lib/db/queries")).getDb();
    const DEMO_WORKSPACE = process.env.DEMO_WORKSPACE_ID || "027ac617-5ab8-4e26-bcb3-1a2f5ad6bef9";
    await db.from("leads").insert({
      workspace_id: DEMO_WORKSPACE,
      phone: digitsOnly,
      state: "NEW",
      channel: "demo_call",
      metadata: {
        source: "website_hero",
        captured_at: new Date().toISOString(),
        demo_origin: "call_me_now",
      },
    });
  } catch {
    // Non-blocking — don't fail the call if lead capture fails
  }

  /* ── Place the call via Telnyx Call Control ───────────── */
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    const result = await createOutboundCall({
      from: fromNumber,
      to: e164Phone,
      connectionId,
      webhookUrl: `${appUrl}/api/webhooks/telnyx/voice`,
      metadata: {
        type: "demo",
        source: "website",
        demo_call: "true",
      },
    });

    if ("error" in result) {
      log("error", "demo_call.telnyx_error", { error: result.error });
      return NextResponse.json(
        { ok: false, error: "Could not start the demo call. Please check your phone number and try again." },
        { status: 500 },
      );
    }

    log("info", "demo_call.placed", { callId: result.callId, to: e164Phone });

    return NextResponse.json({
      ok: true,
      message: "Calling you now! Pick up to hear your AI agent in action.",
    });
  } catch (err) {
    log("error", "demo_call.unexpected_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "Could not start the demo call. Please try again in a moment." },
      { status: 500 },
    );
  }
}
