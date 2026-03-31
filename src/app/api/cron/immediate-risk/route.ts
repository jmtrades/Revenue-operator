/**
 * Cron: immediate risk detection, resolution, continuation_prevented, propagation ignition.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { runImmediateRiskDetectors, runImmediateRiskResolvers } from "@/lib/immediate-risk/detectors";
import { runContinuationPreventedCheck } from "@/lib/immediate-risk/continuation-prevented";
import { runPropagationIgnition } from "@/lib/immediate-risk/propagation-ignition";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("immediate-risk", async () => {
    await runImmediateRiskDetectors();
    await runImmediateRiskResolvers();
    await runContinuationPreventedCheck().catch(() => {
      // cron/immediate-risk error (details omitted to protect PII) 
    });
    await runPropagationIgnition().catch(() => {
      // cron/immediate-risk error (details omitted to protect PII) 
    });
    return { run: 1 };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
