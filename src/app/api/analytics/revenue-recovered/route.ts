/**
 * Revenue recovered metrics endpoint
 * GET /api/analytics/revenue-recovered?workspace_id=...
 * Returns real revenue recovery data using deal values when available.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getRevenueRecovered } from "@/lib/analytics/revenue-recovered";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();

    // Current month range
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endDate = now.toISOString().slice(0, 10);

    // Get real revenue recovery data
    const recovery = await getRevenueRecovered(workspaceId, startDate, endDate);

    // Also get total answered calls this month for context
    const startTs = `${startDate}T00:00:00Z`;
    const { count: callsAnsweredCount } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", startTs)
      .not("call_ended_at", "is", null);

    return NextResponse.json({
      total_recovered: Math.round(recovery.total_revenue_recovered / 100), // dollars
      total_recovered_cents: recovery.total_revenue_recovered,
      calls_answered: callsAnsweredCount ?? 0,
      calls_recovered: recovery.calls_recovered_count,
      calls_recovered_revenue_cents: recovery.calls_recovered_revenue,
      no_shows_recovered: recovery.noshow_recovered_count,
      noshow_recovered_revenue_cents: recovery.noshow_recovered_revenue,
      reactivations: recovery.reactivation_count,
      reactivation_revenue_cents: recovery.reactivation_revenue,
      attribution_method: recovery.attribution_method,
      period: { start: startDate, end: endDate },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "analytics_revenue_recovered_error", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
