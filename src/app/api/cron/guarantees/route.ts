/**
 * Cron: Guarantees bundle. Runs guarantee-layer routines in order.
 * Optional single cron; schedule e.g. every 10 minutes.
 * Does not replace individual crons; orchestrator only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { log } from "@/lib/logger";

const GUARANTEE_STEPS = [
  "/api/cron/progress-watchdog",
  "/api/cron/integrity-audit",
  "/api/cron/closure",
  "/api/cron/handoff-notifications",
  "/api/cron/no-reply",
];

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("guarantees", async () => {
    const base = request.nextUrl?.origin ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!base) {
      // Error (details omitted to protect PII): cron/guarantees] Cannot determine base URL — set NEXT_PUBLIC_APP_URL");
      return { run: 0, ran: 0, steps: GUARANTEE_STEPS.length, error: "no_base_url" };
    }
    const token = process.env.CRON_SECRET ?? "";
    const ran: string[] = [];
    for (const path of GUARANTEE_STEPS) {
      try {
        const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) ran.push(path);
      } catch (err) {
        log("error", "[cron/guarantees] Sub-cron step failed", { error: err instanceof Error ? err.message : String(err) });
      }
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("guarantees").catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
    return { run: ran.length, steps: GUARANTEE_STEPS.length };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
