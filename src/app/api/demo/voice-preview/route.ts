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
    const voiceServerUrl = process.env.NEXT_PUBLIC_VOICE_SERVER_URL || "http://localhost:8100";

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

      const response = await fetch(ttsUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "RecallTouch-DemoProxy/1.0"
        }
      });

      clearTimeout(timeoutId);

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
    log("error", "voice_preview.endpoint_error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
