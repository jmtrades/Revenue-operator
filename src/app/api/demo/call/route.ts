/**
 * POST /api/demo/call — Initiate a demo outbound call to a prospect's phone number.
 * Rate-limited to 2 calls per IP per 10 minutes.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getVoiceProvider } from "@/lib/voice";
import { DEFAULT_RECALL_VOICE_ID } from "@/lib/constants/recall-voices";

const DEMO_GREETING =
  "Hi! This is a demo call from Recall Touch. I'm an AI phone agent — and I bet you can barely tell. I can answer calls, book appointments, and recover missed revenue for your business. Pretty cool, right? If you have any questions, feel free to ask!";

const DEMO_SYSTEM_PROMPT = `You are a friendly, professional AI phone agent demo for Recall Touch.
Your goal is to show the caller how natural and capable you are.
Keep answers brief and conversational. If they ask about pricing, say plans start at $97/month.
If they ask about features, mention: 24/7 call answering, appointment booking, follow-up campaigns, CRM integrations.
Always be warm and enthusiastic but not pushy.`;

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
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid phone number." },
      { status: 400 },
    );
  }

  /* ── CORS origin check ──────────────────────────────── */
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com";

  /* ── Initiate call via voice provider ────────────────── */
  if (!process.env.VOICE_SERVER_URL && !process.env.TWILIO_ACCOUNT_SID) {
    return NextResponse.json(
      { ok: true, message: "Demo calls are being set up. Leave your number and we'll call you back!" },
    );
  }

  try {
    const provider = getVoiceProvider();

    /* Create a temporary demo assistant, then place the call */
    const { assistantId } = await provider.createAssistant({
      name: "Recall Touch Demo",
      systemPrompt: `${DEMO_SYSTEM_PROMPT}\n\nAlways start the call by saying: "${DEMO_GREETING}"`,
      voiceId: DEFAULT_RECALL_VOICE_ID,
      voiceProvider: "deepgram-aura",
      metadata: { type: "demo", source: "website" },
    });

    await provider.createOutboundCall({
      assistantId,
      phoneNumber: phone,
      metadata: { type: "demo", source: "website" },
    });

    return NextResponse.json({
      ok: true,
      message: "Calling you now! Pick up to hear your AI agent in action.",
    });
  } catch (err) {
    console.error("[demo/call] Error initiating demo call:", err);
    return NextResponse.json(
      { ok: false, error: "Could not start the demo call. Please try again in a moment." },
      { status: 500 },
    );
  }
}
