/**
 * Cron: Operability anchor refresh. Runs every 10 minutes.
 * Refreshes active_operational_expectations from live maintenance sources.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getDb } from "@/lib/db/queries";
import { refreshOperabilityAnchor } from "@/lib/operability-anchor/refresh";
import { processMaintainsOperation } from "@/lib/operability-anchor/expectations";
import { recordOperabilityAnchorDay } from "@/lib/operability-anchor/anchor-days";
import { recordAnchorLossOrientationIfDue } from "@/lib/operability-anchor/anchor-loss";
import { detectOperationalRealizations } from "@/lib/operational-realization/detect";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("operability-anchor", async () => {
    const db = getDb();
    const { data: rows } = await db.from("workspaces").select("id");
    const workspaceIds = (rows ?? []).map((r: { id: string }) => r.id);
    for (const workspaceId of workspaceIds) {
      await refreshOperabilityAnchor(workspaceId).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      const anchored = await processMaintainsOperation(workspaceId).catch(() => false);
      if (anchored) await recordOperabilityAnchorDay(workspaceId).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      await recordAnchorLossOrientationIfDue(workspaceId).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      await detectOperationalRealizations(workspaceId).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("operability-anchor").catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
    return { run: 1, workspaces: workspaceIds.length };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
