/**
 * Text-to-speech via ElevenLabs when ELEVENLABS_API_KEY is set.
 * Returns audio/mpeg stream. Client should fall back to browser TTS when 503 or error.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_VOICE_RACHEL = "21m00Tcm4TlvDq8ikWAM"; // Rachel — natural female
const ELEVENLABS_MODEL = "eleven_turbo_v2_5"; // Same as live calls: fast, very human-like, 32 languages

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs not configured", fallback: "browser" },
      { status: 503 }
    );
  }

  let body: { text?: string; voiceId?: string; language?: string };
  try {
    body = (await req.json()) as { text?: string; voiceId?: string; language?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const voiceId =
    typeof body?.voiceId === "string" && body.voiceId.trim()
      ? body.voiceId.trim()
      : process.env.ELEVENLABS_VOICE_ID?.trim() || ELEVENLABS_VOICE_RACHEL;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: ELEVENLABS_MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.78,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[speak] ElevenLabs error:", res.status, errText);
      return NextResponse.json(
        { error: "TTS failed", fallback: "browser" },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("Content-Type") || "audio/mpeg";
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[speak] Request failed:", e);
    return NextResponse.json(
      { error: "TTS request failed", fallback: "browser" },
      { status: 502 }
    );
  }
}
