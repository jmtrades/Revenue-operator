/**
 * Cron: batched handoff notifications (10-min quiet; 2+ = one email).
 * Run every 5 min (cron: 5 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runHandoffNotifications, runHandoffRepeatNotifications } from "@/lib/operational-transfer/handoff-notifications";
import { runSafeCron } from "@/lib/cron/run-safe";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("handoff-notifications", async () => {
    const results = await runHandoffNotifications();
    const repeatSent = await runHandoffRepeatNotifications();
    const run = results.reduce((s, r) => s + r.sent, 0) + repeatSent;
    const failures = results.filter((r) => r.error).length;
    return { run, failures, results, repeatSent };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
