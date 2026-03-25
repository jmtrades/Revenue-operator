/**
 * Cron: Temporal stability detectors. Runs per schedule (e.g. every 6h or every 30 min).
 * Bounded workspace iteration; runTemporalStabilityDetectors per workspace. No deletes.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getDb } from "@/lib/db/queries";
import { runTemporalStabilityDetectors } from "@/lib/temporal-stability";

const MAX_WORKSPACES = 500;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("temporal-stability", async () => {
    const db = getDb();
    const { data: workspaceRows } = await db.from("workspaces").select("id");
    const workspaceIds = (workspaceRows ?? []).slice(0, MAX_WORKSPACES).map((r: { id: string }) => r.id);
    let run = 0;
    for (const workspaceId of workspaceIds) {
      try {
        await runTemporalStabilityDetectors(workspaceId);
        run++;
      } catch {
        // skip
      }
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("temporal-stability").catch((err) => { console.error("[cron/temporal-stability] error:", err instanceof Error ? err.message : err); });
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
