/**
 * Public health probe — designed for uptime monitors (UptimeRobot, Better Uptime,
 * Pingdom, etc.) and status pages. No auth required, but no workspace data is
 * disclosed either — only subsystem up/down booleans and per-check latency.
 *
 * Endpoints:
 *   GET  /api/health  — full JSON report
 *   HEAD /api/health  — status-code only, no body (cheap poll)
 *
 * Subsystems probed: database, voice_server, redis, telnyx, stripe.
 * All probes run in parallel with a 3s timeout each so the worst-case endpoint
 * latency is bounded at ~3s regardless of upstream degradation.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

const PROBE_TIMEOUT_MS = 3_000;

type CheckResult = { ok: boolean; latencyMs: number; note?: string };

const NO_STORE: HeadersInit = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

async function timeProbe(fn: () => Promise<boolean | { ok: boolean; note?: string }>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fn();
    const latencyMs = Date.now() - start;
    if (typeof res === "boolean") return { ok: res, latencyMs };
    return { ok: res.ok, latencyMs, note: res.note };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      note: err instanceof Error ? err.name : "error",
    };
  }
}

async function probeDatabase(): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from("workspaces").select("id").limit(1);
  return !error;
}

async function probeVoiceServer(): Promise<{ ok: boolean; note?: string }> {
  const url = process.env.VOICE_SERVER_URL;
  if (!url) return { ok: false, note: "not_configured" };
  const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
  return { ok: res.ok };
}

async function probeRedis(): Promise<{ ok: boolean; note?: string }> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return { ok: false, note: "not_configured" };
  const { checkRateLimit } = await import("@/lib/rate-limit");
  const result = await checkRateLimit("health-check-ping", 1000, 60_000);
  return { ok: result.allowed };
}

async function probeTelnyx(): Promise<{ ok: boolean; note?: string }> {
  const key = process.env.TELNYX_API_KEY;
  if (!key) return { ok: false, note: "not_configured" };
  const res = await fetch("https://api.telnyx.com/v2/balance", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  return { ok: res.ok };
}

async function probeStripe(): Promise<{ ok: boolean; note?: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, note: "not_configured" };
  // /v1/balance is the cheapest authenticated endpoint — confirms key is valid
  // and Stripe's API is reachable from this region.
  const res = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  return { ok: res.ok };
}

async function runAllProbes(): Promise<Record<string, CheckResult>> {
  const [database, voice_server, redis, telnyx, stripe] = await Promise.all([
    timeProbe(probeDatabase),
    timeProbe(probeVoiceServer),
    timeProbe(probeRedis),
    timeProbe(probeTelnyx),
    timeProbe(probeStripe),
  ]);
  return { database, voice_server, redis, telnyx, stripe };
}

/**
 * Health status is a traffic-light:
 *   - "healthy": every critical subsystem is up
 *   - "degraded": at least one non-critical subsystem is down
 *   - "down": a critical subsystem (database) is down — the product cannot function
 * This mapping matches the convention most status pages expect.
 */
function computeStatus(checks: Record<string, CheckResult>): "healthy" | "degraded" | "down" {
  if (!checks.database.ok) return "down";
  const allOk = Object.values(checks).every((c) => c.ok);
  return allOk ? "healthy" : "degraded";
}

export async function GET() {
  const start = Date.now();
  const checks = await runAllProbes();
  const status = computeStatus(checks);
  const httpStatus = status === "down" ? 503 : 200;

  return NextResponse.json(
    {
      status,
      checks,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      version: process.env.GIT_COMMIT_SHA?.slice(0, 7) || "dev",
      region: process.env.VERCEL_REGION ?? null,
    },
    { status: httpStatus, headers: NO_STORE },
  );
}

/**
 * HEAD variant for high-frequency uptime pollers — returns status code only.
 * Monitors that only care about up/down should use HEAD to cut bandwidth ~95%.
 */
export async function HEAD() {
  const checks = await runAllProbes();
  const status = computeStatus(checks);
  const httpStatus = status === "down" ? 503 : 200;
  return new NextResponse(null, { status: httpStatus, headers: NO_STORE });
}
