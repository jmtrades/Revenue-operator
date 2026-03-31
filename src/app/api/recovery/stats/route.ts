/**
 * GET /api/recovery/stats — Aggregated unanswered-call recovery statistics.
 * Combines call_sessions (unanswered call outcomes) with daily_metrics for recovery data.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count total unanswered calls (no_answer, busy, voicemail)
    const { count: totalMissed } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("outcome", ["no_answer", "busy", "voicemail"])
      .gte("call_started_at", thirtyDaysAgo.toISOString());

    // Count recovered (unanswered calls with metadata.recovered = true)
    const { data: missedRows } = await db
      .from("call_sessions")
      .select("id, metadata, call_started_at")
      .eq("workspace_id", workspaceId)
      .in("outcome", ["no_answer", "busy", "voicemail"])
      .gte("call_started_at", thirtyDaysAgo.toISOString());

    let recovered = 0;
    let pending = 0;
    let lost = 0;
    let totalRecoveryTime = 0;
    let recoveryTimeCount = 0;
    let totalRevenueRecovered = 0;

    for (const row of missedRows ?? []) {
      const meta = (row as { metadata: Record<string, unknown> | null }).metadata;
      const callTime = new Date((row as { call_started_at: string }).call_started_at).getTime();
      const hoursSince = (Date.now() - callTime) / (1000 * 60 * 60);

      if (meta?.recovered === true || meta?.recovery_status === "recovered") {
        recovered++;
        if (typeof meta?.recovery_time_minutes === "number") {
          totalRecoveryTime += meta.recovery_time_minutes as number;
          recoveryTimeCount++;
        }
        if (typeof meta?.estimated_value === "number") {
          totalRevenueRecovered += meta.estimated_value as number;
        } else {
          totalRevenueRecovered += 450; // fallback avg job value
        }
      } else if (meta?.recovery_started === true || meta?.recovery_status === "in_progress") {
        pending++;
      } else if (hoursSince > 48) {
        lost++;
      } else {
        pending++;
      }
    }

    // Also pull from daily_metrics for recovery data
    try {
      const { data: metrics } = await db
        .from("daily_metrics")
        .select("missed_calls, recovered_calls, total_revenue_cents")
        .eq("workspace_id", workspaceId)
        .gte("date", thirtyDaysAgo.toISOString().slice(0, 10));

      for (const m of metrics ?? []) {
        const dm = m as { missed_calls: number | null; recovered_calls: number | null; total_revenue_cents: number | null };
        if (dm.recovered_calls) {
          recovered += dm.recovered_calls;
          totalRevenueRecovered += (dm.recovered_calls * 450);
        }
      }
    } catch {
      // daily_metrics may not have data yet — non-critical
    }

    const total = totalMissed ?? 0;
    const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 0;
    const avgRecoveryTime = recoveryTimeCount > 0 ? Math.round(totalRecoveryTime / recoveryTimeCount) : 0;

    return NextResponse.json({
      total_missed: total,
      recovered,
      pending,
      lost,
      total_revenue_recovered: totalRevenueRecovered,
      avg_recovery_time_minutes: avgRecoveryTime,
      recovery_rate: recoveryRate,
    });
  } catch (e) {
    log("error", "[recovery/stats] unexpected error:", { error: e });
    return NextResponse.json({
      total_missed: 0,
      recovered: 0,
      pending: 0,
      lost: 0,
      total_revenue_recovered: 0,
      avg_recovery_time_minutes: 0,
      recovery_rate: 0,
    });
  }
}
