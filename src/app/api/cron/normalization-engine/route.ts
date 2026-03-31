/**
 * Cron: Normalization engine. Runs detectors per workspace; records behavioral shift evidence only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getDb } from "@/lib/db/queries";
import { runNormalizationDetectors, recordNormalizationOrientationOnce } from "@/lib/normalization-engine";

const MAX_WORKSPACES = 200;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("normalization-engine", async () => {
    const db = getDb();
    const { data: rows } = await db.from("workspaces").select("id");
    const workspaceIds = (rows ?? []).slice(0, MAX_WORKSPACES).map((r: { id: string }) => r.id);
    for (const workspaceId of workspaceIds) {
      await runNormalizationDetectors(workspaceId).catch(() => {
      // cron/normalization-engine error (details omitted to protect PII) 
    });
      await recordNormalizationOrientationOnce(workspaceId).catch(() => {
      // cron/normalization-engine error (details omitted to protect PII) 
    });
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("normalization-engine").catch(() => {
      // cron/normalization-engine error (details omitted to protect PII) 
    });
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
