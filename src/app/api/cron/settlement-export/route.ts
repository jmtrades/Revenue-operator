/**
 * Cron: settlement export. Every 1 hour.
 * Max 50 workspaces, 7 periods per workspace, 20s timeout. Lease prevents double export.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized, recordCronHeartbeat } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import {
  computeExportPeriods,
  exportUsageToStripe,
  tryAcquireSettlementExportLease,
  releaseSettlementExportLease,
} from "@/lib/settlement";

const MAX_PERIODS_PER_RUN = 7;
const MAX_WORKSPACES_PER_RUN = 50;
const RUN_DEADLINE_MS = 20_000;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();
  const { data: rows } = await db
    .from("settlement_accounts")
    .select("workspace_id")
    .eq("settlement_state", "active")
    .limit(MAX_WORKSPACES_PER_RUN);
  const workspaceIds = (rows ?? []).map((r: { workspace_id: string }) => r.workspace_id);
  const deadline = Date.now() + RUN_DEADLINE_MS;

  let exported = 0;
  let failed = 0;
  for (const workspaceId of workspaceIds) {
    if (Date.now() >= deadline) break;
    const acquired = await tryAcquireSettlementExportLease(workspaceId);
    if (!acquired) continue;
    try {
      const periods = await computeExportPeriods(workspaceId);
      const toExport = periods.slice(0, MAX_PERIODS_PER_RUN);
      for (const { period_start, period_end } of toExport) {
        if (Date.now() >= deadline) break;
        const result = await exportUsageToStripe(workspaceId, period_start, period_end);
        if (result.ok) exported++;
        else failed++;
      }
    } finally {
      await releaseSettlementExportLease(workspaceId);
    }
  }

  await recordCronHeartbeat("settlement-export").catch((e) => {
    console.warn("[cron/settlement-export] recordCronHeartbeat failed:", e instanceof Error ? e.message : String(e));
  });
  return NextResponse.json({
    ok: true,
    workspaces_processed: workspaceIds.length,
    periods_exported: exported,
    periods_failed: failed,
  });
}
