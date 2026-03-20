/**
 * Voice Demo Lead Capture Endpoint
 * Captures emails and industry preferences from the voice demo page
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

// Simple in-memory rate limit tracking (IP -> timestamp array)
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = rateLimitMap.get(ip) || [];
  timestamps = timestamps.filter(t => t > windowStart);

  if (timestamps.length >= maxRequests) {
    log("warn", "demo_signup.rate_limit_exceeded", { ip, count: timestamps.length, maxRequests });
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, industry, source } = body;

    // Validate input
    if (!email || !industry) {
      return NextResponse.json(
        { error: "Email and industry required" },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Insert into leads table with "NEW" state and website_demo source
    const { error } = await db.from("leads").insert({
      email,
      channel: industry,
      state: "NEW",
      metadata: {
        source: source || "website_demo",
        industry,
        demo_origin: "voice_demo",
        captured_at: new Date().toISOString()
      },
      detected_behaviour: "voice_demo_signup"
    });

    if (error) {
      log("error", "demo_signup.database_error", { error: String(error) });
      return NextResponse.json(
        { error: "Failed to save signup" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Signup captured successfully" });
  } catch (error) {
    log("error", "demo_signup.endpoint_error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
