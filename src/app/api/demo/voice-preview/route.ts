/**
 * Voice Preview Proxy Endpoint
 *
 * Priority chain (optimized for maximum quality at zero/near-zero cost):
 *   1. Self-hosted Recall voice server — $0 marginal cost, unlimited
 *   2. Deepgram Aura-2 — enterprise-grade TTS, 44+ voices, 48kHz MP3
 *
 * Uses Deepgram Aura-2 (next-gen model, NOT the original Aura):
 *   - Human-like prosody with natural breathing and emotional range
 *   - Hand-picked best voice per persona from 44+ English voices
 *   - 48kHz WAV (linear16) for studio-quality, lossless output
 *   - Aggressive 24h caching (same text+voice = one API call ever)
 *   - Rate limiting to prevent abuse
 *
 * Cost model at scale:
 *   - Self-hosted: $0 (GPU already provisioned for call handling)
 *   - Deepgram Aura-2: ~$0.006 per preview (avg 200 chars at $0.030/1K)
 *   - With 24h cache: effectively free after first play
 *   - $200 free credit covers ~33,000 previews uncached
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

/* ─── Deepgram Aura-2 — next-gen voice mapping ─── */

/**
 * Map Recall voice IDs → Deepgram Aura-2 models.
 *
 * Aura-2 is Deepgram's enterprise-grade TTS — dramatically more natural
 * than the original Aura models. 44+ English voices with human-like
 * prosody, natural breathing, and emotional range.
 *
 * Hand-picked voices for each persona based on Deepgram's voice profiles:
 *
 *   Warm Female:        aura-2-helena-en  (Caring, Natural, Positive, Friendly, Raspy)
 *   Professional Female: aura-2-athena-en  (Calm, Smooth, Professional)
 *   Casual Female:      aura-2-andromeda-en (Casual, Expressive, Comfortable)
 *   Empathetic Female:  aura-2-vesta-en   (Natural, Expressive, Patient, Empathetic)
 *   Energetic Female:   aura-2-thalia-en  (Clear, Confident, Energetic, Enthusiastic)
 *
 *   Confident Male:     aura-2-orpheus-en (Professional, Clear, Confident, Trustworthy)
 *   Warm Male:          aura-2-aries-en   (Warm, Energetic, Caring)
 *   Deep Male:          aura-2-zeus-en    (Deep, Trustworthy, Smooth)
 *   Professional Male:  aura-2-odysseus-en (Calm, Smooth, Comfortable, Professional)
 *   Calm Male:          aura-2-pluto-en   (Smooth, Calm, Empathetic, Baritone)
 *
 *   British Female:     aura-2-pandora-en (Smooth, Calm, Melodic, Breathy)
 *   British Male:       aura-2-draco-en   (Warm, Approachable, Trustworthy, Baritone)
 *   Australian Female:  aura-2-theia-en   (Expressive, Polite, Sincere)
 *   Australian Male:    aura-2-hyperion-en (Caring, Warm, Empathetic)
 */
function mapVoiceToDeepgram(voiceId: string): string {
  const map: Record<string, string> = {
    // ── Female voices ──
    // Sarah (warm receptionist / agent) → Helena (Caring, Natural, Friendly, Raspy)
    "us-female-warm-receptionist": "aura-2-helena-en",
    "us-female-warm-agent": "aura-2-helena-en",
    "us-female-warm": "aura-2-helena-en",
    "us-female-friendly": "aura-2-cordelia-en",
    "us-female-empathetic": "aura-2-vesta-en",
    "warm-female": "aura-2-helena-en",

    // Jennifer (professional) → Athena (Calm, Smooth, Professional)
    "us-female-professional": "aura-2-athena-en",
    "us-female-authoritative": "aura-2-electra-en",
    "professional-female": "aura-2-athena-en",

    // Emma (casual) → Andromeda (Casual, Expressive, Comfortable)
    "us-female-casual": "aura-2-andromeda-en",
    "us-female-energetic": "aura-2-thalia-en",
    "us-female-calm": "aura-2-harmonia-en",

    // ── Male voices ──
    // Alex (confident) → Orpheus (Professional, Clear, Confident, Trustworthy)
    "us-male-confident": "aura-2-orpheus-en",
    "us-male-professional": "aura-2-odysseus-en",
    "us-male-deep": "aura-2-zeus-en",
    "confident-male": "aura-2-orpheus-en",
    "professional-male": "aura-2-odysseus-en",

    // Marcus (warm) → Aries (Warm, Energetic, Caring)
    "us-male-warm": "aura-2-aries-en",
    "us-male-friendly": "aura-2-atlas-en",
    "us-male-casual": "aura-2-apollo-en",
    "us-male-energetic": "aura-2-hermes-en",
    "us-male-calm": "aura-2-pluto-en",
    "warm-male": "aura-2-aries-en",

    // ── British voices ──
    "uk-female-professional": "aura-2-pandora-en",
    "uk-female-warm": "aura-2-pandora-en",
    "uk-female-casual": "aura-2-pandora-en",
    "uk-female-authoritative": "aura-2-pandora-en",
    "uk-male-professional": "aura-2-draco-en",
    "uk-male-warm": "aura-2-draco-en",
    "uk-male-casual": "aura-2-draco-en",
    "uk-male-deep": "aura-2-draco-en",

    // ── Australian voices ──
    "au-female-warm": "aura-2-theia-en",
    "au-female-professional": "aura-2-theia-en",
    "au-male-warm": "aura-2-hyperion-en",
    "au-male-professional": "aura-2-hyperion-en",
  };

  // Default: Helena (Caring, Natural, Positive, Friendly) — the most human-sounding
  // voice for first impressions. Warm and natural with a slight rasp that
  // makes it sound like a real person, not a machine.
  return map[voiceId] || "aura-2-helena-en";
}

/**
 * Deepgram Aura-2 TTS — enterprise-grade voice synthesis.
 * Next-gen model with human-like prosody, natural breathing,
 * and emotional range. 48kHz WAV (linear16) for studio-quality output.
 * $0.030 per 1,000 characters ($0.027 at Growth tier).
 * With 24h caching, effectively free for demo previews.
 */
async function handleDeepgramTTS(
  voiceId: string,
  text: string,
  apiKey: string
): Promise<{ response: NextResponse | null; error?: string }> {
  try {
    const model = mapVoiceToDeepgram(voiceId);
    // linear16 at 48kHz = uncompressed studio-quality WAV — every nuance
    // of Aura-2's breathing, emotion, and prosody comes through perfectly.
    // ~100KB/sec, fine for short demo clips (3-8 seconds).
    const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=linear16&sample_rate=48000`;

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
      const errMsg = `Deepgram ${response.status}: ${errText.slice(0, 200)}`;
      log("error", "voice_preview.deepgram_error", {
        status: response.status,
        model,
        response: errText,
      });
      return { response: null, error: errMsg };
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "audio/wav";

    return {
      response: new NextResponse(audioBuffer, {
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
      }),
    };
  } catch (error) {
    const err = error as Error;
    const errMsg = err.name === "AbortError" ? "timeout" : err.message;
    log("error", "voice_preview.deepgram_error", { error: errMsg });
    return { response: null, error: `Deepgram exception: ${errMsg}` };
  }
}

/**
 * Self-hosted Recall voice server TTS — zero marginal cost.
 */
async function handleVoiceServerTTS(
  voiceId: string,
  text: string,
  voiceServerUrl: string
): Promise<{ response: NextResponse | null; error?: string }> {
  try {
    const ttsUrl = new URL(`${voiceServerUrl}/tts/preview`);
    ttsUrl.searchParams.set("voice_id", voiceId);
    ttsUrl.searchParams.set("text", text);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(ttsUrl.toString(), {
        method: "POST",
        signal: controller.signal,
        headers: { "User-Agent": "RecallTouch/1.0" },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return { response: null, error: `VoiceServer ${response.status} from ${voiceServerUrl}` };
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "audio/mpeg";

    return {
      response: new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": audioBuffer.byteLength.toString(),
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin":
            process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com",
          "X-Voice-Provider": "recall-voice-server",
        },
      }),
    };
  } catch (error) {
    const err = error as Error;
    const errMsg = err.name === "AbortError" ? "timeout" : err.message;
    return { response: null, error: `VoiceServer exception: ${errMsg}` };
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

    // Diagnostic: log provider availability (no secrets exposed)
    log("info", "voice_preview.providers", {
      hasVoiceServer: !!voiceServerUrl,
      hasDeepgram: !!deepgramApiKey,
      deepgramKeyLength: deepgramApiKey?.length ?? 0,
      voiceId,
    });

    const errors: string[] = [];

    // ── Priority 1: Self-hosted voice server ($0 marginal cost) ──
    if (voiceServerUrl) {
      const { response: result, error } = await handleVoiceServerTTS(
        voiceId,
        text,
        voiceServerUrl
      );
      if (result) {
        const cloned = result.clone();
        const buf = await cloned.arrayBuffer();
        setCachedAudio(
          cacheKey,
          buf,
          cloned.headers.get("Content-Type") || "audio/mpeg"
        );
        return result;
      }
      if (error) errors.push(error);
    }

    // ── Priority 2: Deepgram Aura-2 ──
    if (deepgramApiKey) {
      const { response: result, error } = await handleDeepgramTTS(voiceId, text, deepgramApiKey);
      if (result) {
        const cloned = result.clone();
        const buf = await cloned.arrayBuffer();
        setCachedAudio(
          cacheKey,
          buf,
          cloned.headers.get("Content-Type") || "audio/mpeg"
        );
        return result;
      }
      if (error) errors.push(error);
    }

    // ── No provider succeeded ──
    log("error", "voice_preview.no_provider", {
      hasVoiceServer: !!voiceServerUrl,
      hasDeepgram: !!deepgramApiKey,
      errors,
    });
    return NextResponse.json(
      {
        error: "Voice preview unavailable",
        debug: {
          hasVoiceServer: !!voiceServerUrl,
          hasDeepgram: !!deepgramApiKey,
          deepgramKeyLength: deepgramApiKey?.length ?? 0,
          errors,
        },
      },
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
