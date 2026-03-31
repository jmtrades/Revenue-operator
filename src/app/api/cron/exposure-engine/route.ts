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

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("exposure-engine", async () => {
    const db = getDb();
    const { data: rows } = await db.from("workspaces").select("id");
    const workspaceIds = (rows ?? []).map((r: { id: string }) => r.id);
    const now = new Date();
    for (const workspaceId of workspaceIds) {
      await detectReplyDelayRisk(workspaceId, now).catch(() => {
      // cron/exposure-engine error (details omitted to protect PII) 
    });
      await detectAttendanceUncertaintyRisk(workspaceId, now).catch(() => {
      // cron/exposure-engine error (details omitted to protect PII) 
    });
      await detectPaymentStallRisk(workspaceId, now).catch(() => {
      // cron/exposure-engine error (details omitted to protect PII) 
    });
      await detectCounterpartyUnconfirmedRisk(workspaceId, now).catch(() => {
      // cron/exposure-engine error (details omitted to protect PII) 
    });
      await detectCommitmentOutcomeUncertain(workspaceId, now).catch(() => {
      // cron/exposure-engine error (details omitted to protect PII) 
    });
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("exposure-engine").catch(() => {
      // cron/exposure-engine error (details omitted to protect PII) 
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
