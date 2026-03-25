/**
 * Cron: installation phase transition. Every 30 minutes.
 * transitionInstallationPhase for all workspaces with state rows.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getWorkspaceIdsWithInstallationState, transitionInstallationPhase } from "@/lib/installation";
import { runStabilizationDetection } from "@/lib/confidence-engine/stabilization";
import { runDomainStabilization } from "@/lib/confidence-engine/domain-stabilization";
import { evaluateEconomicGravity } from "@/lib/economic-gravity";
import { recomputeInstitutionalState } from "@/lib/institutional-state";
import { detectOperationalSilence } from "@/lib/detachment";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("installation-transition", async () => {
    const workspaceIds = await getWorkspaceIdsWithInstallationState();
    let run = 0;
    for (const workspaceId of workspaceIds) {
      await transitionInstallationPhase(workspaceId).catch((err) => { console.error("[cron/installation-transition] error:", err instanceof Error ? err.message : err); });
      await evaluateEconomicGravity(workspaceId).catch((err) => { console.error("[cron/installation-transition] error:", err instanceof Error ? err.message : err); });
      await recomputeInstitutionalState(workspaceId).catch((err) => { console.error("[cron/installation-transition] error:", err instanceof Error ? err.message : err); });
      await detectOperationalSilence(workspaceId).catch((err) => { console.error("[cron/installation-transition] error:", err instanceof Error ? err.message : err); });
      run++;
    }
    await runStabilizationDetection().catch((err) => { console.error("[cron/installation-transition] error:", err instanceof Error ? err.message : err); });
    await runDomainStabilization().catch((err) => { console.error("[cron/installation-transition] error:", err instanceof Error ? err.message : err); });
    return { run };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
