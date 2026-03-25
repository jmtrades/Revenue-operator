export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { assertSameOrigin } from "@/lib/http/csrf";

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

function getVoiceServerUrl(): string {
  const url = process.env.VOICE_SERVER_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("VOICE_SERVER_URL is required in production");
    }
    return "http://localhost:8100";
  }
  return url;
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId || !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const { HUMAN_VOICE_DEFAULTS } = await import("@/lib/voice/human-voice-defaults");
  const defaults = { ...HUMAN_VOICE_DEFAULTS, ...settings };

  const voiceServerUrl = getVoiceServerUrl();

  try {
    const response = await fetch(
      `${voiceServerUrl}/tts/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          voice_id: voiceId,
          text: text.slice(0, 5000),
          stability: clamp(defaults.stability, 0, 1),
          similarity_boost: clamp(defaults.similarityBoost, 0, 1),
          style: clamp(defaults.style, 0, 1),
          use_speaker_boost: defaults.useSpeakerBoost,
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
  } catch (error) {
    console.error("[preview-voice] Voice preview error:", error);
    return NextResponse.json(
      { error: "Voice preview failed" },
      { status: 503 },
    );
  }
}
