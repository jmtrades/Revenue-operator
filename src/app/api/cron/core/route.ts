/**
 * Cron bundler: one route that runs core crons sequentially. For new installs schedule every 2 min to /api/cron/core.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";

/** Order: connector-inbox, hosted-executor, watchdog, self-healing, approval-expiry, data-retention, appointment-reminders, then queue/recoveries/engines. */
const CORE_STEPS = [
  "/api/cron/connector-inbox",
  "/api/cron/hosted-executor",
  "/api/cron/action-intent-watchdog",
  "/api/cron/self-healing",
  "/api/cron/approval-expiry",
  "/api/cron/data-retention",
  "/api/cron/appointment-reminders",
  "/api/cron/campaign-process",
  "/api/cron/process-queue",
  "/api/cron/process-sync-queue",
  "/api/cron/commitment-recovery",
  "/api/cron/opportunity-recovery",
  "/api/cron/payment-completion",
  "/api/cron/shared-transaction-recovery",
  "/api/cron/exposure-engine",
  "/api/cron/operability-anchor",
  "/api/cron/assumption-engine",
  "/api/cron/normalization-engine",
  "/api/cron/proof-capsules",
  "/api/cron/assurance-delivery",
  "/api/cron/settlement-export",
  "/api/cron/calendar-ended",
  "/api/cron/reconcile-reality",
  "/api/cron/process-reactivation",
  "/api/cron/autonomous-brain",
];

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("core", async () => {
    const base = request.nextUrl?.origin ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!base) {
      // Error (details omitted to protect PII): cron/core] Cannot determine base URL — set NEXT_PUBLIC_APP_URL");
      return { run: 0, ran: 0, steps: CORE_STEPS.length, error: "no_base_url" };
    }
    const token = process.env.CRON_SECRET ?? "";
    const ran: string[] = [];
    for (const path of CORE_STEPS) {
      try {
        const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) ran.push(path);
      } catch (_err) {
        // Sub-cron failed; continue
      }
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("core").catch(() => {
      // cron/core error (details omitted to protect PII) 
    });
    return { run: ran.length, ran: ran.length, steps: CORE_STEPS.length };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
