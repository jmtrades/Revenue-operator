/**
 * Cron: Operational Closure. Enforce responsibility invariants for active leads.
 * Never sends messages; only drives pipeline (enqueue decision, escalate, reconciliation, mark dormant).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getActiveLeadIds, enforceClosureForLead } from "@/lib/closure/enforce-closure";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

const BATCH_SIZE = 200;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("closure", async () => {
    const leads = await getActiveLeadIds(BATCH_SIZE);
    let run = 0;
    let failures = 0;
    const details: { lead_id: string; action?: string; error?: string }[] = [];

    for (const { lead_id, workspace_id } of leads) {
      const out = await enforceClosureForLead(lead_id, workspace_id);
      if (out.action) run++;
      if (out.error) {
        failures++;
        details.push({ lead_id, error: out.error });
      } else if (out.action) {
        details.push({ lead_id, action: out.action.type });
      }
    }

    return { run, failures, details };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
