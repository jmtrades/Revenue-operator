/**
 * Cron: Opportunity Recovery. Runs every 5 minutes.
 * Transitions momentum states (active → slowing → stalled → lost), runs revival, escalates after 3 failed attempts.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import {
  transitionMomentumStates,
  getOpportunitiesNeedingRevival,
  runRevivalForOpportunity,
  escalateOpportunityToAuthority,
} from "@/lib/opportunity-recovery";
import { log } from "@/lib/logger";

const MAX_REVIVAL_PER_RUN = 20;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("opportunity-recovery", async () => {
    const { getWorkspaceIdsWithAutomationAllowed } = await import("@/lib/adoption-acceleration/installation-state");
    const allowedWorkspaces = await getWorkspaceIdsWithAutomationAllowed();
    const transitions = await transitionMomentumStates();
    const list = await getOpportunitiesNeedingRevival(MAX_REVIVAL_PER_RUN);
    const filtered = list.filter((o) => allowedWorkspaces.has(o.workspace_id));
    for (const o of list) {
      if (!allowedWorkspaces.has(o.workspace_id)) {
        const { recordObservedRisk } = await import("@/lib/adoption-acceleration/observed-risks");
        await recordObservedRisk(o.workspace_id, "stalled_opportunity", "opportunity_state", o.id).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      }
    }
    const { getRecoveryTimingsForWorkspace } = await import("@/lib/recovery-profile");
    let revived = 0;
    let escalated = 0;
    for (const opp of filtered) {
      const { ok } = await runRevivalForOpportunity(opp);
      if (ok) revived++;
      const timings = await getRecoveryTimingsForWorkspace(opp.workspace_id);
      if (opp.revive_attempts + 1 >= timings.maxReviveAttempts) {
        await escalateOpportunityToAuthority(opp.id);
        escalated++;
      }
    }
    return {
      run: 1,
      transitions,
      revived,
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
