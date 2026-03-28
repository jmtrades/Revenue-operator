/**
 * Voice Demo Lead Capture Endpoint
 * Captures emails and industry preferences from the voice demo page
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const ip = getClientIp(req);

    // Distributed rate limit: 5 per minute per IP
    const rl = await checkRateLimit(`demo_signup:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a moment." },
        { status: 429 }
      );
    }

    let body: { email?: string; industry?: string; source?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }
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

    // Length limits
    if (email.length > 320 || industry.length > 100 || (source && source.length > 100)) {
      return NextResponse.json(
        { error: "Input too long" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Use the demo workspace for website signups — MUST be set in production env
    const DEMO_WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID;
    if (!DEMO_WORKSPACE_ID) {
      log("error", "demo_signup.missing_workspace_id", { detail: "DEMO_WORKSPACE_ID env var is not set" });
      return NextResponse.json({ error: "Demo temporarily unavailable" }, { status: 503 });
    }

    // Insert into leads table with "NEW" state and website_demo source
    const { error } = await db.from("leads").insert({
      workspace_id: DEMO_WORKSPACE_ID,
      email,
      channel: industry,
      status: "NEW",
      metadata: {
        source: source || "website_demo",
        industry,
        demo_origin: "voice_demo",
        captured_at: new Date().toISOString(),
      },
      detected_behaviour: "voice_demo_signup",
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
