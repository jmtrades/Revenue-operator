export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

type PreviewVoiceBody = {
  voice_id?: string;
  text?: string;
  settings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  let body: PreviewVoiceBody;
  try {
    body = (await req.json()) as PreviewVoiceBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const voiceId = typeof body.voice_id === "string" ? body.voice_id.trim() : "";
  const rawText = typeof body.text === "string" ? body.text.trim() : "";
  const text = rawText || "Thanks for calling. How can I help you today?";

  if (!voiceId) {
    return NextResponse.json({ error: "voice_id is required" }, { status: 400 });
  }

  const settings = body.settings ?? {};

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability:
            typeof settings.stability === "number"
              ? clamp(settings.stability, 0, 1)
              : 0.55,
          similarity_boost:
            typeof settings.similarityBoost === "number"
              ? clamp(settings.similarityBoost, 0, 1)
              : 0.8,
          style:
            typeof settings.style === "number"
              ? clamp(settings.style, 0, 1)
              : 0.35,
          use_speaker_boost:
            typeof settings.useSpeakerBoost === "boolean"
              ? settings.useSpeakerBoost
              : true,
        },
      }),
    },
  );

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "");
    return NextResponse.json(
      { error: errorText || "Voice generation failed" },
      { status: 502 },
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
