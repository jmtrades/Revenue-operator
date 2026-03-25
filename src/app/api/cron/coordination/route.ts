/**
 * Cron: coordination semantics — when humans act.
 * Run every 15 min so we hit start-of-work, midday, pre-call, workday-close windows (cron: 15 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  runStartOfWorkWindow,
  runMiddayClarityWindow,
  runPreCallPreparationWindow,
  runWorkdayCompletionSignal,
} from "@/lib/coordination-semantics";
import { runSafeCron } from "@/lib/cron/run-safe";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("coordination", async () => {
    const [start, midday, preCall, workday] = await Promise.all([
      runStartOfWorkWindow(),
      runMiddayClarityWindow(),
      runPreCallPreparationWindow(),
      runWorkdayCompletionSignal(),
    ]);
    const sent = start.filter((r) => r.sent).length + midday.filter((r) => r.sent).length + preCall.filter((r) => r.sent).length + workday.filter((r) => r.sent).length;
    return {
      run: sent,
      failures: 0,
      startOfWork: { sent: start.filter((r) => r.sent).length },
      middayClarity: { sent: midday.filter((r) => r.sent).length },
      preCallPrep: { sent: preCall.filter((r) => r.sent).length },
      workdayCompletion: { sent: workday.filter((r) => r.sent).length },
    };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
