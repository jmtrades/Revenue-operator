/**
 * Voice Preview Proxy Endpoint
 * Proxies TTS requests to voice server and handles rate limiting
 * Prevents CORS issues between demo page and Python voice server
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";

// Rate limiting: IP -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Reset if window has expired
  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // Check if limit exceeded
  if (record.count >= maxRequests) {
    log("warn", "voice_preview.rate_limit_exceeded", { ip, count: record.count, maxRequests });
    return false;
  }

  // Increment counter
  record.count++;
  return true;
}

/**
 * Map internal voice IDs to Deepgram Aura model names
 */
function mapVoiceIdToDeepgramModel(voiceId: string): string {
  // Map recall-touch voice IDs to Deepgram Aura models
  // Deepgram Aura models: aura-asteria-en, aura-luna-en, aura-orion-en, aura-stella-en, etc.
  const voiceMap: { [key: string]: string } = {
    // Female voices
    "us-female-warm-receptionist": "aura-stella-en",
    "us-female-professional": "aura-asteria-en",
    "us-female-casual": "aura-luna-en",
    "us-female-energetic": "aura-stella-en",
    "us-female-calm": "aura-luna-en",
    "us-female-authoritative": "aura-asteria-en",
    "us-female-friendly": "aura-stella-en",
    "us-female-empathetic": "aura-luna-en",

    // Male voices
    "us-male-confident": "aura-orion-en",
    "us-male-casual": "aura-orion-en",
    "us-male-professional": "aura-asteria-en",
    "us-male-warm": "aura-orion-en",
    "us-male-energetic": "aura-stella-en",
    "us-male-calm": "aura-luna-en",
    "us-male-deep": "aura-orion-en",
    "us-male-friendly": "aura-orion-en",

    // British voices - default to available models
    "uk-female-professional": "aura-asteria-en",
    "uk-female-warm": "aura-stella-en",
    "uk-female-casual": "aura-luna-en",
    "uk-female-authoritative": "aura-asteria-en",

    "uk-male-professional": "aura-asteria-en",
    "uk-male-warm": "aura-orion-en",
    "uk-male-casual": "aura-orion-en",
    "uk-male-deep": "aura-orion-en",

    // Default to Aura Luna for unmapped voices
  };

  return voiceMap[voiceId] || "aura-luna-en";
}

/**
 * Handle TTS request via Deepgram API fallback
 */
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
      const responseText = await response.text();
      log("error", "voice_preview.deepgram_error", {
        status: response.status,
        response: responseText,
      });

      if (response.status === 401) {
        return NextResponse.json(
          { error: "Deepgram API key invalid" },
          { status: 401 }
        );
      }

      if (response.status === 404) {
        return NextResponse.json(
          { error: `Voice model ${model} not found` },
          { status: 404 }
        );
      }

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
  } catch (error) {
    const err = error as Error;

    if (err.name === "AbortError") {
      log("error", "voice_preview.deepgram_timeout", { error: "request timeout" });
      return NextResponse.json(
        { error: "Voice service timeout" },
        { status: 504 }
      );
    }

    log("error", "voice_preview.deepgram_error", { error: err.message });
    return NextResponse.json(
      { error: "Could not connect to voice service" },
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Rate limit: 10 requests per minute per IP
    if (!checkRateLimit(ip, 10, 60000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before trying again." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get("voice_id");
    const text = searchParams.get("text");
    const industry = searchParams.get("industry");

    // Validate parameters
    if (!voiceId || !text) {
      return NextResponse.json(
        { error: "voice_id and text parameters required" },
        { status: 400 }
      );
    }

    // Validate text length (prevent abuse)
    if (text.length > 500) {
      return NextResponse.json(
        { error: "Text too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // Get voice server URL from environment
    const voiceServerUrl = process.env.NEXT_PUBLIC_VOICE_SERVER_URL;
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

    if (!voiceServerUrl && !deepgramApiKey) {
      return NextResponse.json(
        { error: "Voice server not configured" },
        { status: 503 }
      );
    }

    // Use Deepgram as fallback if voice server is not available
    if (!voiceServerUrl && deepgramApiKey) {
      return handleDeepgramFallback(voiceId, text, deepgramApiKey);
    }

    // Build the request to the voice server
    const ttsUrl = new URL(`${voiceServerUrl}/tts/preview`);
    ttsUrl.searchParams.set("voice_id", voiceId);
    ttsUrl.searchParams.set("text", text);
    if (industry) {
      ttsUrl.searchParams.set("industry", industry);
    }

    try {
      // Fetch from voice server with 10 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response;
      try {
        response = await fetch(ttsUrl.toString(), {
          signal: controller.signal,
          headers: {
            "User-Agent": "RecallTouch-DemoProxy/1.0"
          }
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const responseText = await response.text();
        log("error", "voice_preview.server_error", { status: response.status, response: responseText });

        // Return fallback audio or error
        if (response.status === 404) {
          return NextResponse.json(
            { error: `Voice ${voiceId} not found` },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: "Voice service temporarily unavailable. Please try again." },
          { status: 503 }
        );
      }

      // Get the audio blob
      const audioBuffer = await response.arrayBuffer();

      // Stream the audio response
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": response.headers.get("content-type") || "audio/mpeg",
          "Content-Length": audioBuffer.byteLength.toString(),
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
          "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com"
        }
      });
    } catch (fetchError) {
      const err = fetchError as Error;

      if (err.name === "AbortError") {
        log("error", "voice_preview.timeout", { error: "request timeout" });
        return NextResponse.json(
          { error: "Voice service timeout. Please try again." },
          { status: 504 }
        );
      }

      log("error", "voice_preview.connection_error", { error: err.message });

      // Fallback: return a silent audio or error response
      return NextResponse.json(
        { error: "Could not connect to voice service. Please check your internet connection." },
        { status: 503 }
      );
    }
  } catch (error) {
    log("error", "voice_preview.endpoint_error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
