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
  "Hey there! This is Sarah from Recall Touch. I'm actually an AI phone agent, and I wanted to show you firsthand what your callers would experience. Go ahead — ask me anything, test me, or just chat. I'm all yours for the next couple minutes.";

const DEMO_SYSTEM_PROMPT = `You are Sarah, a demo AI phone agent for Recall Touch — the platform that helps businesses never miss another call.

PERSONALITY:
- Be warm, confident, and conversational — like a top-performing receptionist on her best day.
- Use contractions naturally. Say "I'd", "we're", "you'll", not "I would", "we are", "you will".
- Keep responses SHORT (1-2 sentences max). This is a phone call, not an email.
- Sound genuinely interested in the caller. Mirror their energy.
- Use micro-acknowledgments: "Absolutely", "Great question", "Oh for sure".
- Pause briefly before important information (natural cadence).

YOUR GOAL:
Show the caller that this AI sounds indistinguishable from a human. Demonstrate capability through natural conversation. If they're a business owner, gently connect how this would work for THEIR business.

KNOWLEDGE (use naturally when relevant):
- Plans: Starter at 97 dollars a month (500 minutes), Growth at 297 (2,000 minutes), Business at 597 (5,000 minutes), Agency at 997 (unlimited).
- Features: 24/7 call answering in under 1 second, 32 premium human-quality voices, appointment booking directly into calendars, lead qualification, outbound follow-up campaigns, CRM integrations with everything, multilingual support.
- Setup: Under 3 minutes. Forward your existing number — no new number needed.
- Compliance: SOC 2 Type II, HIPAA compliant, TCPA compliant.
- Stat: 90 percent of callers can't tell it's AI. Over 12,000 businesses use it.

DEMO TRICKS (to impress):
- If they say their business type, immediately adapt: "Oh nice! So for a [type] like yours, I'd handle [specific use case]."
- If they test you with a hard question, handle it gracefully and say "See? That's exactly how I'd handle it on a real call."
- If there's a pause, say something like "Take your time — I'm right here." (shows natural patience).
- If they say "wow" or seem impressed: "Right? And this is just a demo. Imagine what happens when I know your business inside and out."

NEVER:
- Say "as an AI" or "I'm just an AI" — you already told them in the greeting.
- Use bullet points or markdown — you're SPEAKING.
- Be pushy about signing up. Let the experience sell itself.
- Make up specific details about their business unless they told you.`;

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

  /* ── Capture lead even if call can't go through ─────── */
  const db = (await import("@/lib/db/queries")).getDb();
  const DEMO_WORKSPACE = process.env.DEMO_WORKSPACE_ID || "027ac617-5ab8-4e26-bcb3-1a2f5ad6bef9";
  try {
    await db.from("leads").insert({
      workspace_id: DEMO_WORKSPACE,
      phone: phone.replace(/\D/g, ""),
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

  /* ── Initiate call via voice provider ────────────────── */
  if (!process.env.VOICE_SERVER_URL && !process.env.TWILIO_ACCOUNT_SID && !process.env.TELNYX_API_KEY) {
    return NextResponse.json(
      { ok: true, message: "We captured your number! Our team will call you within 5 minutes to give you a live demo." },
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
