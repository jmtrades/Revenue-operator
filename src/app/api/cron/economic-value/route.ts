/**
 * Cron: Aggregate economic_events into economic_value_ledger. Run every 1 hour.
 * No UI. No reports.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { aggregateEconomicValueSinceLastLedger } from "@/lib/economic-events";
import { runSafeCron } from "@/lib/cron/run-safe";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("economic-value", async () => {
    const db = getDb();
    const { data: rows } = await db
      .from("economic_events")
      .select("workspace_id")
      .order("created_at", { ascending: false });
    const workspaceIds = [...new Set((rows ?? []).map((r: { workspace_id: string }) => r.workspace_id))];
    let processed = 0;
    for (const workspaceId of workspaceIds) {
      await aggregateEconomicValueSinceLastLedger(workspaceId);
      processed++;
    }
    return { run: 1, processed };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
