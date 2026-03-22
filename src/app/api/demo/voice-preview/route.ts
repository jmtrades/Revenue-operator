/**
 * Voice Preview Proxy Endpoint
 *
 * Priority chain:
 *   1. ElevenLabs Turbo v2.5 (best human quality — primary)
 *   2. Self-hosted voice server (if configured)
 *   3. Deepgram Aura (fallback)
 *
 * Uses ElevenLabs' most natural voices with tuned settings from
 * human-voice-defaults.ts to produce audio indistinguishable from a
 * real person. Responses are cached for 24 hours to control costs.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";

// Rate limiting: IP -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    log("warn", "voice_preview.rate_limit_exceeded", { ip, count: record.count, maxRequests });
    return false;
  }
  record.count++;
  return true;
}

/* ─── ElevenLabs voice mapping ─── */

/**
 * Map Recall voice IDs to the best ElevenLabs voice IDs.
 *
 * Selected for maximum human realism on phone calls:
 * - Rachel (21m00Tcm4TlvDq8ikWAM): warm, natural, empathetic — best female receptionist
 * - Bella (EXAVITQu4vr4xnSDxMaL):  casual, friendly, young — perfect for modern brands
 * - Josh (TxGEqnHWrfWFTfGW9XjX):   professional, confident male — authoritative but warm
 * - Elli (MF3mGyEYCl7XYWbV9V6O):    warm, soft, caring — great for empathetic contexts
 * - Antoni (ErXwobaYiN019PkySvjV):   professional male — articulate, trustworthy
 */
function mapVoiceIdToElevenLabs(voiceId: string): string {
  const voiceMap: Record<string, string> = {
    // Sarah voices → Rachel (warm, welcoming, human)
    "us-female-warm-receptionist": "21m00Tcm4TlvDq8ikWAM",
    "us-female-friendly": "21m00Tcm4TlvDq8ikWAM",
    "us-female-empathetic": "21m00Tcm4TlvDq8ikWAM",

    // Emma voices → Bella (casual, friendly, young)
    "us-female-casual": "EXAVITQu4vr4xnSDxMaL",
    "us-female-energetic": "EXAVITQu4vr4xnSDxMaL",

    // Professional female → Elli (articulate, clear)
    "us-female-professional": "MF3mGyEYCl7XYWbV9V6O",
    "us-female-authoritative": "MF3mGyEYCl7XYWbV9V6O",
    "us-female-calm": "MF3mGyEYCl7XYWbV9V6O",

    // Alex voices → Josh (confident, warm male)
    "us-male-professional": "TxGEqnHWrfWFTfGW9XjX",
    "us-male-confident": "TxGEqnHWrfWFTfGW9XjX",
    "us-male-warm": "TxGEqnHWrfWFTfGW9XjX",

    // Casual male → Antoni (friendly, approachable)
    "us-male-casual": "ErXwobaYiN019PkySvjV",
    "us-male-friendly": "ErXwobaYiN019PkySvjV",
    "us-male-energetic": "ErXwobaYiN019PkySvjV",
    "us-male-calm": "ErXwobaYiN019PkySvjV",
    "us-male-deep": "TxGEqnHWrfWFTfGW9XjX",

    // British voices → map to closest match
    "uk-female-professional": "MF3mGyEYCl7XYWbV9V6O",
    "uk-female-warm": "21m00Tcm4TlvDq8ikWAM",
    "uk-female-casual": "EXAVITQu4vr4xnSDxMaL",
    "uk-female-authoritative": "MF3mGyEYCl7XYWbV9V6O",
    "uk-male-professional": "TxGEqnHWrfWFTfGW9XjX",
    "uk-male-warm": "ErXwobaYiN019PkySvjV",
    "uk-male-casual": "ErXwobaYiN019PkySvjV",
    "uk-male-deep": "TxGEqnHWrfWFTfGW9XjX",
  };

  // Default to Rachel — the most universally natural-sounding voice
  return voiceMap[voiceId] || "21m00Tcm4TlvDq8ikWAM";
}

/**
 * ElevenLabs TTS — primary provider.
 * Uses Turbo v2.5 for lowest latency + highest quality.
 * Voice settings tuned from human-voice-defaults.ts for phone-grade realism.
 */
async function handleElevenLabsTTS(
  voiceId: string,
  text: string,
  apiKey: string
): Promise<NextResponse | null> {
  try {
    const elevenLabsVoiceId = mapVoiceIdToElevenLabs(voiceId);

    // Turbo v2.5: fastest + most natural. eleven_turbo_v2_5
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            // These match HUMAN_VOICE_DEFAULTS for maximum realism:
            stability: 0.38,           // Low = expressive, human variation
            similarity_boost: 0.82,    // High clarity without over-processing
            style: 0.48,               // Natural emphasis on key words
            use_speaker_boost: true,    // Clearer on phone/speakers
          },
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      log("error", "voice_preview.elevenlabs_error", {
        status: response.status,
        response: errText,
        voiceId: elevenLabsVoiceId,
      });
      // Return null to fall through to next provider
      return null;
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400", // 24h cache — save API cost
        "Access-Control-Allow-Origin":
          process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com",
      },
    });
  } catch (error) {
    const err = error as Error;
    log("error", "voice_preview.elevenlabs_error", {
      error: err.name === "AbortError" ? "timeout" : err.message,
    });
    return null; // Fall through to next provider
  }
}

/* ─── Deepgram mapping (unchanged, used as final fallback) ─── */

function mapVoiceIdToDeepgramModel(voiceId: string): string {
  const voiceMap: Record<string, string> = {
    "us-female-warm-receptionist": "aura-stella-en",
    "us-female-professional": "aura-asteria-en",
    "us-female-casual": "aura-luna-en",
    "us-female-energetic": "aura-stella-en",
    "us-female-calm": "aura-luna-en",
    "us-female-authoritative": "aura-asteria-en",
    "us-female-friendly": "aura-stella-en",
    "us-female-empathetic": "aura-luna-en",
    "us-male-confident": "aura-orion-en",
    "us-male-casual": "aura-orion-en",
    "us-male-professional": "aura-asteria-en",
    "us-male-warm": "aura-orion-en",
    "us-male-energetic": "aura-stella-en",
    "us-male-calm": "aura-luna-en",
    "us-male-deep": "aura-orion-en",
    "us-male-friendly": "aura-orion-en",
    "uk-female-professional": "aura-asteria-en",
    "uk-female-warm": "aura-stella-en",
    "uk-female-casual": "aura-luna-en",
    "uk-female-authoritative": "aura-asteria-en",
    "uk-male-professional": "aura-asteria-en",
    "uk-male-warm": "aura-orion-en",
    "uk-male-casual": "aura-orion-en",
    "uk-male-deep": "aura-orion-en",
  };
  return voiceMap[voiceId] || "aura-luna-en";
}

async function handleDeepgramFallback(
  voiceId: string,
  text: string,
  apiKey: string
): Promise<NextResponse> {
  try {
    const model = mapVoiceIdToDeepgramModel(voiceId);
    const deepgramUrl = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(deepgramUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "RecallTouch-DemoProxy/1.0",
        },
        body: JSON.stringify({ text }),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Voice service temporarily unavailable" },
        { status: 503 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin":
          process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not connect to voice service" },
      { status: 503 }
    );
  }
}

/* ─── Main handler ─── */

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (!checkRateLimit(ip, 20, 60000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before trying again." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get("voice_id");
    const text = searchParams.get("text");

    if (!voiceId || !text) {
      return NextResponse.json(
        { error: "voice_id and text parameters required" },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: "Text too long (max 500 characters)" },
        { status: 400 }
      );
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const voiceServerUrl = process.env.NEXT_PUBLIC_VOICE_SERVER_URL;
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

    // ── Priority 1: ElevenLabs (best quality) ──
    if (elevenLabsKey) {
      const result = await handleElevenLabsTTS(voiceId, text, elevenLabsKey);
      if (result) return result;
      // If ElevenLabs failed, fall through to next provider
    }

    // ── Priority 2: Self-hosted voice server ──
    if (voiceServerUrl) {
      try {
        const ttsUrl = new URL(`${voiceServerUrl}/tts/preview`);
        ttsUrl.searchParams.set("voice_id", voiceId);
        ttsUrl.searchParams.set("text", text);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let response;
        try {
          response = await fetch(ttsUrl.toString(), {
            signal: controller.signal,
            headers: { "User-Agent": "RecallTouch-DemoProxy/1.0" },
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              "Content-Type": response.headers.get("content-type") || "audio/mpeg",
              "Content-Length": audioBuffer.byteLength.toString(),
              "Cache-Control": "public, max-age=3600",
              "Access-Control-Allow-Origin":
                process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com",
            },
          });
        }
      } catch {
        // Voice server unavailable — fall through
      }
    }

    // ── Priority 3: Deepgram Aura (last resort) ──
    if (deepgramApiKey) {
      return handleDeepgramFallback(voiceId, text, deepgramApiKey);
    }

    return NextResponse.json(
      { error: "No voice provider configured" },
      { status: 503 }
    );
  } catch (error) {
    log("error", "voice_preview.endpoint_error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
