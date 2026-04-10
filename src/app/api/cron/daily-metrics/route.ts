/**
 * Cron: Daily metrics aggregation job.
 * Computes daily_metrics rollup for all active workspaces.
 * Called daily (e.g., at 00:15 UTC) via cron scheduler.
 * Processes yesterday's date.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { subDays } from "date-fns";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { rollupAllWorkspaces } from "@/lib/analytics/daily-rollup";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  try {
    // Calculate yesterday's date in ISO 8601 format (YYYY-MM-DD)
    const yesterday = subDays(new Date(), 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    // Rollup metrics for all workspaces
    const { processed, failed } = await rollupAllWorkspaces(dateStr);

    return NextResponse.json({
      ok: true,
      message: "Daily metrics rollup completed",
      date: dateStr,
      workspaces_processed: processed,
      workspaces_failed: failed,
    });
  } catch (error) {
    // Error (details omitted to protect PII): cron/daily-metrics]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
