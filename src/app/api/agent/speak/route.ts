/**
 * Text-to-speech via Recall voice server.
 * Returns audio/mpeg stream. Client should fall back to browser TTS when 503 or error.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";

const DEFAULT_VOICE_ID = "us-female-warm-receptionist"; // Default Recall voice

async function getHumanVoiceDefaults() {
  const { HUMAN_VOICE_DEFAULTS } = await import("@/lib/voice/human-voice-defaults");
  return HUMAN_VOICE_DEFAULTS;
}

async function getVoiceConfigFromDb(workspaceId: string) {
  try {
    const db = getDb();
    const { data } = await db
      .from("workspaces")
      .select("voice_config")
      .eq("id", workspaceId)
      .maybeSingle();

    if (data?.voice_config && typeof data.voice_config === "object") {
      return data.voice_config;
    }
  } catch {
    // Table may not have voice_config column yet, fall back to defaults
  }
  return null;
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
  // Rate limit: 10 TTS requests per minute per IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`agent-speak:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests", fallback: "browser" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
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
      : DEFAULT_VOICE_ID;

  // Try to get voice config from database, fall back to defaults
  const session = await getSession(req);
  let voiceConfig = await getHumanVoiceDefaults();

  if (session?.workspaceId) {
    const dbConfig = await getVoiceConfigFromDb(session.workspaceId);
    if (dbConfig) {
      voiceConfig = { ...voiceConfig, ...dbConfig };
    }
  }

  const voiceServerUrl = getVoiceServerUrl();

  try {
    const res = await fetch(
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
          stability: voiceConfig.stability,
          similarity_boost: voiceConfig.similarityBoost,
          style: voiceConfig.style,
          use_speaker_boost: voiceConfig.useSpeakerBoost,
        }),
      }
    );

    if (!res.ok) {
      await res.text();
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
  } catch {
    return NextResponse.json(
      { error: "TTS request failed", fallback: "browser" },
      { status: 502 }
    );
  }
}
