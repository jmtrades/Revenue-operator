/**
 * Voice Preview Proxy Endpoint
 *
 * Priority chain (optimized for maximum quality at zero/near-zero cost):
 *   1. Self-hosted Recall voice server — $0 marginal cost, unlimited
 *   2. Deepgram Aura — $0.015/1K chars, $200 free credit, best free-tier TTS
 *
 * No paid TTS providers (ElevenLabs, etc.). All voice quality comes from:
 *   - Careful model selection per voice persona
 *   - Aggressive 24h caching (same text+voice = one API call ever)
 *   - Rate limiting to prevent abuse
 *
 * Cost model at scale:
 *   - Self-hosted: $0 (GPU already provisioned for call handling)
 *   - Deepgram fallback: ~$0.003 per preview (avg 200 chars)
 *   - With 24h cache: effectively free after first play
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";

/* ─── In-memory caches ─── */

// Rate limiting: IP -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Audio cache: "voiceId:textHash" -> { buffer, contentType, cachedAt }
const audioCache = new Map<
  string,
  { buffer: ArrayBuffer; contentType: string; cachedAt: number }
>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 200;

function checkRateLimit(
  ip: string,
  maxRequests: number = 20,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    log("warn", "voice_preview.rate_limit_exceeded", {
      ip,
      count: record.count,
    });
    return false;
  }
  record.count++;
  return true;
}

/** Simple hash for cache keys — not cryptographic, just dedup */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function getCacheKey(voiceId: string, text: string): string {
  return `${voiceId}:${simpleHash(text)}`;
}

function getCachedAudio(
  key: string
): { buffer: ArrayBuffer; contentType: string } | null {
  const entry = audioCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    audioCache.delete(key);
    return null;
  }
  return { buffer: entry.buffer, contentType: entry.contentType };
}

function setCachedAudio(
  key: string,
  buffer: ArrayBuffer,
  contentType: string
): void {
  // Evict oldest if at capacity
  if (audioCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey) audioCache.delete(firstKey);
  }
  audioCache.set(key, { buffer, contentType, cachedAt: Date.now() });
}

/* ─── Deepgram Aura — best model mapping ─── */

/**
 * Map Recall voice IDs → Deepgram Aura models.
 *
 * Deepgram Aura voice quality ranking (best → good):
 *   Female: aura-asteria-en (clear, professional, most natural)
 *           aura-stella-en  (warm, friendly)
 *           aura-luna-en    (soft, calm)
 *   Male:   aura-orion-en   (deep, confident, most natural)
 *           aura-arcas-en   (authoritative)
 *           aura-helios-en  (warm, approachable)
 *           aura-zeus-en    (powerful, commanding)
 *
 * Each voice is mapped to the Deepgram model that best matches
 * its persona for maximum realism at zero cost.
 */
function mapVoiceToDeepgram(voiceId: string): string {
  const map: Record<string, string> = {
    // ── Female voices ──
    // Sarah (warm receptionist) → Stella (warmest female)
    "us-female-warm-receptionist": "aura-stella-en",
    "us-female-friendly": "aura-stella-en",
    "us-female-empathetic": "aura-stella-en",

    // Jennifer (professional) → Asteria (clearest, most professional)
    "us-female-professional": "aura-asteria-en",
    "us-female-authoritative": "aura-asteria-en",

    // Emma (casual) → Luna (soft, approachable)
    "us-female-casual": "aura-luna-en",
    "us-female-energetic": "aura-asteria-en",
    "us-female-calm": "aura-luna-en",

    // ── Male voices ──
    // Alex (confident) → Orion (deep, most natural male)
    "us-male-confident": "aura-orion-en",
    "us-male-professional": "aura-orion-en",
    "us-male-deep": "aura-orion-en",

    // Marcus (warm) → Helios (warm, approachable)
    "us-male-warm": "aura-helios-en",
    "us-male-friendly": "aura-helios-en",
    "us-male-casual": "aura-helios-en",
    "us-male-energetic": "aura-helios-en",
    "us-male-calm": "aura-helios-en",

    // ── British voices ──
    "uk-female-professional": "aura-asteria-en",
    "uk-female-warm": "aura-stella-en",
    "uk-female-casual": "aura-luna-en",
    "uk-female-authoritative": "aura-asteria-en",
    "uk-male-professional": "aura-orion-en",
    "uk-male-warm": "aura-helios-en",
    "uk-male-casual": "aura-helios-en",
    "uk-male-deep": "aura-orion-en",
  };

  // Default: Stella (warm female) — most universally appealing for demos
  return map[voiceId] || "aura-stella-en";
}

/**
 * Deepgram Aura TTS — primary cloud provider.
 * $0.015 per 1,000 characters. With caching, effectively free.
 */
async function handleDeepgramTTS(
  voiceId: string,
  text: string,
  apiKey: string
): Promise<NextResponse | null> {
  try {
    const model = mapVoiceToDeepgram(voiceId);
    const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3&sample_rate=24000`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "RecallTouch/1.0",
        },
        body: JSON.stringify({ text }),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      log("error", "voice_preview.deepgram_error", {
        status: response.status,
        model,
        response: errText,
      });
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "audio/mpeg";

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin":
          process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com",
        "X-Voice-Provider": "deepgram",
        "X-Voice-Model": model,
      },
    });
  } catch (error) {
    const err = error as Error;
    log("error", "voice_preview.deepgram_error", {
      error: err.name === "AbortError" ? "timeout" : err.message,
    });
    return null;
  }
}

/**
 * Self-hosted Recall voice server TTS — zero marginal cost.
 */
async function handleVoiceServerTTS(
  voiceId: string,
  text: string,
  voiceServerUrl: string
): Promise<NextResponse | null> {
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
        headers: { "User-Agent": "RecallTouch/1.0" },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) return null;

    const audioBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "audio/mpeg";

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin":
          process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com",
        "X-Voice-Provider": "recall-voice-server",
      },
    });
  } catch {
    return null;
  }
}

/* ─── Main handler ─── */

export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

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

    // ── Check in-memory cache first (costs $0) ──
    const cacheKey = getCacheKey(voiceId, text);
    const cached = getCachedAudio(cacheKey);
    if (cached) {
      return new NextResponse(cached.buffer, {
        status: 200,
        headers: {
          "Content-Type": cached.contentType,
          "Content-Length": cached.buffer.byteLength.toString(),
          "Cache-Control": "public, max-age=86400",
          "X-Voice-Cache": "hit",
          "Access-Control-Allow-Origin":
            process.env.NEXT_PUBLIC_APP_URL ||
            "https://www.recall-touch.com",
        },
      });
    }

    const voiceServerUrl = process.env.NEXT_PUBLIC_VOICE_SERVER_URL;
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

    // ── Priority 1: Self-hosted voice server ($0 marginal cost) ──
    if (voiceServerUrl) {
      const result = await handleVoiceServerTTS(
        voiceId,
        text,
        voiceServerUrl
      );
      if (result) {
        // Cache the response for next time
        const cloned = result.clone();
        const buf = await cloned.arrayBuffer();
        setCachedAudio(
          cacheKey,
          buf,
          cloned.headers.get("Content-Type") || "audio/mpeg"
        );
        return result;
      }
    }

    // ── Priority 2: Deepgram Aura ($0.015/1K chars, cached 24h) ──
    if (deepgramApiKey) {
      const result = await handleDeepgramTTS(voiceId, text, deepgramApiKey);
      if (result) {
        // Cache the response for next time
        const cloned = result.clone();
        const buf = await cloned.arrayBuffer();
        setCachedAudio(
          cacheKey,
          buf,
          cloned.headers.get("Content-Type") || "audio/mpeg"
        );
        return result;
      }
    }

    // ── No provider available ──
    return NextResponse.json(
      { error: "Voice preview unavailable" },
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
// Trigger redeploy to pick up DEEPGRAM_API_KEY env var
