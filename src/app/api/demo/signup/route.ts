/**
 * Voice Demo Lead Capture Endpoint
 * Captures emails and industry preferences from the voice demo page
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";

const signupSchema = z.object({
  email: z.string().email().max(320).transform((s) => s.trim()),
  industry: z.string().min(1).max(100).transform((s) => s.trim()),
  source: z.string().max(100).transform((s) => s.trim()).optional(),
});

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Email and industry required, must be valid format" },
        { status: 400 }
      );
    }
    const { email, industry, source } = parsed.data;

    const db = getDb();

    // Use the demo workspace for website signups — MUST be set in production env
    const DEMO_WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID;
    if (!DEMO_WORKSPACE_ID) {
      log("error", "demo_signup.missing_workspace_id", { detail: "DEMO_WORKSPACE_ID env var is not set" });
      return NextResponse.json({ error: "Demo temporarily unavailable" }, { status: 503 });
    }

    // Insert into leads table with "NEW" state and website_demo source
    const signupResult = await runWithWriteContextAsync("api", async () =>
      db.from("leads").insert({
        workspace_id: DEMO_WORKSPACE_ID,
        email,
        channel: industry,
        state: "NEW",
        metadata: {
          source: source || "website_demo",
          industry,
          demo_origin: "voice_demo",
          captured_at: new Date().toISOString(),
        },
        detected_behaviour: "voice_demo_signup",
      })
    ) as { error?: unknown };

    if (signupResult.error) {
      log("error", "demo_signup.database_error", { error: String(signupResult.error) });
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
