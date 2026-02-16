/**
 * Cron: economic usage backfill. Daily at 02:00 UTC.
 * For each workspace with economic_activation, backfill economic_usage_meter for last 7 days.
 * Idempotent (setUsageMeter overwrites).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized, recordCronHeartbeat } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { aggregateAndAppendUsageForPeriod } from "@/lib/economic-participation";

const BACKFILL_DAYS = 7;

function getUtcDayBounds(dayOffset: number): { start: string; end: string } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - dayOffset);
  const start = d.toISOString();
  const end = new Date(d.getTime() + 24 * 60 * 60 * 1000).toISOString();
  return { start, end };
}

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();
  const { data: rows } = await db.from("economic_activation").select("workspace_id");
  const workspaceIds = (rows ?? []).map((r: { workspace_id: string }) => r.workspace_id);

  let periodsFilled = 0;
  for (const workspaceId of workspaceIds) {
    for (let day = 1; day <= BACKFILL_DAYS; day++) {
      const { start, end } = getUtcDayBounds(day);
      await aggregateAndAppendUsageForPeriod(workspaceId, start, end).catch(() => {});
      periodsFilled++;
    }
  }

  await recordCronHeartbeat("economic-usage-backfill").catch(() => {});
  return NextResponse.json({
    ok: true,
    workspaces_processed: workspaceIds.length,
    periods_filled: periodsFilled,
  });
}
