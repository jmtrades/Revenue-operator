/**
 * Cron: Commitment Recovery. Runs every minute.
 * Transitions stale commitments, runs recovery, escalates after 2 failed attempts.
 * No UI; behavior only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import {
  transitionStaleCommitments,
  loadCommitmentsNeedingRecovery,
  runRecoveryForCommitment,
  escalateCommitmentToAuthority,
} from "@/lib/commitment-recovery";

const MAX_RECOVERY_PER_RUN = 30;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("commitment-recovery", async () => {
    const { getWorkspaceIdsWithAutomationAllowed } = await import("@/lib/adoption-acceleration/installation-state");
    const allowedWorkspaces = await getWorkspaceIdsWithAutomationAllowed();
    const transitions = await transitionStaleCommitments();
    const list = await loadCommitmentsNeedingRecovery(MAX_RECOVERY_PER_RUN);
    const filtered = list.filter((c) => allowedWorkspaces.has(c.workspace_id));
    for (const c of list) {
      if (!allowedWorkspaces.has(c.workspace_id)) {
        const { recordObservedRisk } = await import("@/lib/adoption-acceleration/observed-risks");
        await recordObservedRisk(c.workspace_id, "stalled_commitment", "commitment", c.id).catch(() => {});
      }
    }
    let recovered = 0;
    let escalated = 0;
    for (const c of filtered) {
      const { ok } = await runRecoveryForCommitment(c);
      if (ok) recovered++;
      else if (c.recovery_attempts + 1 >= 2) {
        const { escalated: didEscalate } = await escalateCommitmentToAuthority(c.id);
        if (didEscalate) escalated++;
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
