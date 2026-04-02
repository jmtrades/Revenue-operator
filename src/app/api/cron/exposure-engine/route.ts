/**
 * Cron: Exposure engine. Runs every 10 minutes. Runs detectors per workspace; no messages or phase changes.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getDb } from "@/lib/db/queries";
import {
  detectReplyDelayRisk,
  detectAttendanceUncertaintyRisk,
  detectPaymentStallRisk,
  detectCounterpartyUnconfirmedRisk,
  detectCommitmentOutcomeUncertain,
} from "@/lib/exposure-engine";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("exposure-engine", async () => {
    const db = getDb();
    const { data: rows } = await db.from("workspaces").select("id").limit(100);
    const workspaceIds = (rows ?? []).map((r: { id: string }) => r.id);
    const now = new Date();
    for (const workspaceId of workspaceIds) {
      await detectReplyDelayRisk(workspaceId, now).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      await detectAttendanceUncertaintyRisk(workspaceId, now).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      await detectPaymentStallRisk(workspaceId, now).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      await detectCounterpartyUnconfirmedRisk(workspaceId, now).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      await detectCommitmentOutcomeUncertain(workspaceId, now).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("exposure-engine").catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
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
