/**
 * Cron: Payment Completion. Runs every 10 minutes.
 * Transitions pending→overdue, overdue→recovering; runs recovery; escalates after 3 attempts.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import {
  transitionPaymentObligations,
  getObligationsNeedingRecovery,
  runRecoveryForObligation,
  escalateObligationToAuthority,
} from "@/lib/payment-completion";

const MAX_RECOVERY_PER_RUN = 25;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("payment-completion", async () => {
    const { getWorkspaceIdsWithAutomationAllowed } = await import("@/lib/adoption-acceleration/installation-state");
    const allowedWorkspaces = await getWorkspaceIdsWithAutomationAllowed();
    const transitions = await transitionPaymentObligations();
    const list = await getObligationsNeedingRecovery(MAX_RECOVERY_PER_RUN);
    const filtered = list.filter((ob) => allowedWorkspaces.has(ob.workspace_id));
    for (const ob of list) {
      if (!allowedWorkspaces.has(ob.workspace_id)) {
        const { recordObservedRisk } = await import("@/lib/adoption-acceleration/observed-risks");
        await recordObservedRisk(ob.workspace_id, "overdue_payment", "payment_obligation", ob.id).catch(() => {
      // cron/payment-completion error (details omitted to protect PII) 
    });
      }
    }
    let recovered = 0;
    let escalated = 0;
    for (const ob of filtered) {
      const { ok } = await runRecoveryForObligation(ob);
      if (ok) recovered++;
      if (ob.recovery_attempts + 1 >= 3) {
        await escalateObligationToAuthority(ob.id);
        escalated++;
      }
    }
    return {
      run: 1,
      transitions,
      recovered,
      escalated,
      processed: filtered.length,
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
