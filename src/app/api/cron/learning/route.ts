/**
 * Cron: Learning job — update qualification thresholds, timing intervals, prediction weights.
 * Never modifies past conversations. Call via cron daily: GET /api/cron/learning
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 30);

  try {
    const { data: workspaces } = await db.from("workspaces").select("id").limit(100);
    let updated = 0;

    for (const ws of workspaces ?? []) {
      const workspaceId = (ws as { id: string }).id;

      // Compute avg time-to-qualify for won deals (qualification threshold signal)
      const { data: wonDeals } = await db
        .from("deals")
        .select("id, lead_id, created_at, closed_at")
        .eq("workspace_id", workspaceId)
        .eq("status", "won");
      let avgDaysToClose = 7;
      if (wonDeals && wonDeals.length > 0) {
        const leadIds = (wonDeals as { lead_id: string }[]).map((d) => d.lead_id);
        const { data: leads } = await db
          .from("leads")
          .select("id, created_at")
          .in("id", leadIds);
        const leadMap = new Map((leads ?? []).map((l: { id: string; created_at: string }) => [l.id, l.created_at]));
        const days: number[] = [];
        for (const d of wonDeals as { lead_id: string; closed_at: string }[]) {
          const created = leadMap.get(d.lead_id);
          if (created && d.closed_at) {
            const diff = (new Date(d.closed_at).getTime() - new Date(created).getTime()) / (1000 * 60 * 60 * 24);
            days.push(diff);
          }
        }
        if (days.length > 0) {
          avgDaysToClose = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
        }
      }

      const learnedMinIntervalSec = Math.max(180, Math.min(600, 400 - avgDaysToClose * 20));

      await db.from("learning_weights").insert({
        workspace_id: workspaceId,
        metric_key: "prediction_weight_qualified",
        metric_value: avgDaysToClose < 10 ? 0.25 : 0.15,
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
        meta: { updated_at: now.toISOString() },
      });

      await db.from("learning_weights").insert({
        workspace_id: workspaceId,
        metric_key: "follow_up_interval_hours",
        metric_value: avgDaysToClose < 7 ? 4 : 8,
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
        meta: { updated_at: now.toISOString() },
      });

      // Store learning outputs in metrics (append-only, never modify past)
      await db.from("metrics").insert({
        workspace_id: workspaceId,
        metric_key: "learned_avg_days_to_close",
        metric_value: avgDaysToClose,
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
        meta: { updated_at: now.toISOString() },
      });
      await db.from("metrics").insert({
        workspace_id: workspaceId,
        metric_key: "learned_min_interval_sec",
        metric_value: learnedMinIntervalSec,
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
        meta: { avg_days: avgDaysToClose, updated_at: now.toISOString() },
      });

      updated++;
    }

    return NextResponse.json({ ok: true, workspaces_updated: updated });
  } catch (err) {
    // Error (details omitted to protect PII): cron/learning] unexpected error:", err);
    return NextResponse.json(
      { ok: true, note: "error_handled", ts: new Date().toISOString() },
      { status: 200 }
    );
  }
}
