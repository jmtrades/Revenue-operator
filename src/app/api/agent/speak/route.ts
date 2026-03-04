export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: string; voice_id?: string };
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voiceId = typeof body?.voice_id === "string" ? body.voice_id.trim() : "";

    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
    if (!voiceId) return NextResponse.json({ error: "voice_id required" }, { status: 400 });

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 501 });
    }

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
      }),
    });

    if (!r.ok) {
      return NextResponse.json({ error: "Voice synthesis failed" }, { status: 502 });
    }

    const audio = await r.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Voice synthesis failed" }, { status: 502 });
  }
}

