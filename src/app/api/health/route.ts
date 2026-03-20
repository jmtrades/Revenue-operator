/**
 * System health probe for hosting and self-monitoring.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET() {
  const checks: Record<string, boolean> = {};
  const start = Date.now();

  // Database
  try {
    const db = getDb();
    const { error } = await db.from("workspaces").select("id").limit(1);
    checks.database = !error;
  } catch {
    checks.database = false;
  }

  // Voice Server
  try {
    const res = await fetch(`${process.env.VOICE_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    checks.voice_server = res.ok;
  } catch {
    checks.voice_server = false;
  }

  // Redis
  try {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("health-check-ping", 1000, 60000);
    checks.redis = result.allowed;
  } catch {
    checks.redis = false;
  }

  // Telnyx
  try {
    const res = await fetch("https://api.telnyx.com/v2/balance", {
      headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}` },
      signal: AbortSignal.timeout(3000),
    });
    checks.telnyx = res.ok;
  } catch {
    checks.telnyx = false;
  }

  const allHealthy = Object.values(checks).every(Boolean);

  return NextResponse.json({
    status: allHealthy ? "healthy" : "degraded",
    checks,
    latencyMs: Date.now() - start,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
  }, { status: allHealthy ? 200 : 503 });
}
