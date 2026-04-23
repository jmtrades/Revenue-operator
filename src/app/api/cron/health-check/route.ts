/**
 * Cron health check: monitor all cron job heartbeats.
 * Detects missed or failed crons and sends alerts to workspace owners.
 *
 * Schedule: every 15 minutes via /api/cron/health-check
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { checkCronHealth, alertStaleJobs } from "@/lib/cron/health-check";
import { recordCronHeartbeat } from "@/lib/runtime/cron-heartbeat";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  try {
    // Check all cron heartbeats
    const staleJobs = await checkCronHealth();

    // Log findings
    if (staleJobs.length > 0) {
      log("warn", "cron.health-check.stale-jobs-detected", {
        count: staleJobs.length,
        jobs: staleJobs.map((j) => `${j.name}(${j.minutes_since_run}m)`).join(", "),
      });

      // Alert workspace owners
      await alertStaleJobs(staleJobs);
    } else {
      log("info", "cron.health-check.all-healthy");
    }

    // Record this health check's own heartbeat
    await recordCronHeartbeat("health-check").catch((e: unknown) => {
      console.warn("[cron/health-check] heartbeat failed:", e instanceof Error ? e.message : String(e));
    });

    return NextResponse.json({
      ok: true,
      healthy: staleJobs.length === 0,
      stale_jobs: staleJobs.length,
      jobs: staleJobs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "cron.health-check.failed", { error: msg });

    // Still record heartbeat even on error, to track that health-check ran
    await recordCronHeartbeat("health-check").catch((e: unknown) => {
      console.warn("[cron/health-check] heartbeat failed:", e instanceof Error ? e.message : String(e));
    });

    return NextResponse.json(
      { ok: false, error: msg, stale_jobs: 0 },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
