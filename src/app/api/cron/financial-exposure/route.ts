/**
 * Cron: financial exposure detection, resolution, escalation memory, pre-activation conversion.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { runFinancialExposureDetectors, runFinancialExposureResolvers } from "@/lib/financial-exposure/detectors";
import { runEscalationMemory } from "@/lib/financial-exposure/escalation-memory";
import { runPreActivationConversion } from "@/lib/financial-exposure/pre-activation-conversion";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("financial-exposure", async () => {
    await runFinancialExposureDetectors();
    await runFinancialExposureResolvers();
    await runEscalationMemory().catch(() => {});
    await runPreActivationConversion().catch(() => {});
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
