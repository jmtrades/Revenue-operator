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

/**
 * Normalize a phone number to E.164 format.
 * Supports:
 *  - Numbers already in E.164: +44 7911 123456 → +447911123456
 *  - Numbers with 00 prefix: 0044 7911 123456 → +447911123456
 *  - Bare US/CA numbers (10 digits): 5551234567 → +15551234567
 *  - Numbers with leading country code but no +: 447911123456 → +447911123456
 * Returns null if the number doesn't look valid.
 */
function normalizeToE164(input: string): string | null {
  // Strip all non-digit characters except leading +
  const hasPlus = input.startsWith("+");
  const digits = input.replace(/\D/g, "");

  // E.164 allows 7–15 digits (after the +)
  if (digits.length < 7 || digits.length > 15) return null;

  // Already has + prefix — trust it
  if (hasPlus) return `+${digits}`;

  // International dialing with 00 prefix (common in Europe/Asia)
  if (digits.startsWith("00") && digits.length >= 9) {
    return `+${digits.slice(2)}`;
  }

  // 10-digit bare number — assume US/Canada (+1)
  if (digits.length === 10) return `+1${digits}`;

  // 11 digits starting with 1 — already includes US country code
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // Anything else with 7–15 digits — prepend + and let Telnyx validate
  return `+${digits}`;
}

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
  if (!phone) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid phone number with country code." },
      { status: 400 },
    );
  }

  // Normalize to E.164 format — support any country
  let e164Phone = normalizeToE164(phone);
  if (!e164Phone) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid phone number including your country code (e.g. +44 for UK, +61 for Australia)." },
      { status: 400 },
    );
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
      phone: e164Phone,
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
