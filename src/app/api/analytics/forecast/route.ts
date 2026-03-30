/**
 * GET /api/analytics/forecast?workspace_id=...
 * Revenue forecasting/projection for current month based on daily_metrics data.
 * Returns current month revenue, projected month-end, growth rate vs prior month, and confidence level.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

interface ForecastResponse {
  current_revenue_cents: number;
  projected_revenue_cents: number;
  growth_rate_pct: number | null;
  daily_avg_cents: number;
  days_remaining: number;
  confidence: "high" | "medium" | "low";
}

export async function GET(req: NextRequest): Promise<NextResponse<ForecastResponse | { error: string } | unknown>> {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();

    // Get current date info
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const currentDay = today.getDate();
    const daysRemaining = daysInMonth - currentDay;

    // Format dates as YYYY-MM-DD
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const monthEndStr = monthEnd.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    // Query: last 30 days of revenue data for this workspace
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    let recentMetrics: Array<{ date: string; total_revenue_cents: number }> = [];
    try {
      const { data, error: recentErr } = await db
        .from("daily_metrics")
        .select("date, total_revenue_cents")
        .eq("workspace_id", workspaceId)
        .gte("date", thirtyDaysAgoStr)
        .lte("date", todayStr)
        .order("date", { ascending: false });

      if (recentErr) {
        console.warn("[forecast] Could not fetch recent metrics (may be empty):", recentErr.message);
      } else {
        recentMetrics = data ?? [];
      }
    } catch (fetchErr) {
      console.warn("[forecast] Exception fetching recent metrics:", fetchErr);
    }

    if (recentMetrics.length === 0) {
      return NextResponse.json<ForecastResponse>({
        current_revenue_cents: 0,
        projected_revenue_cents: 0,
        growth_rate_pct: null,
        daily_avg_cents: 0,
        days_remaining: daysInMonth - currentDay,
        confidence: "low",
      });
    }

    // Calculate current month revenue (this month's data through today)
    const currentMonthRevenue = recentMetrics
      .filter((m) => {
        const date = new Date(m.date);
        return date >= monthStart && date <= today;
      })
      .reduce((sum, m) => sum + (m.total_revenue_cents || 0), 0);

    // Calculate prior month revenue for growth rate
    const priorMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const priorMonthEnd = new Date(currentYear, currentMonth, 0);
    const priorMonthStartStr = priorMonthStart.toISOString().split("T")[0];
    const priorMonthEndStr = priorMonthEnd.toISOString().split("T")[0];

    let priorMetrics: Array<{ date: string; total_revenue_cents: number }> = [];
    try {
      const { data, error: priorErr } = await db
        .from("daily_metrics")
        .select("date, total_revenue_cents")
        .eq("workspace_id", workspaceId)
        .gte("date", priorMonthStartStr)
        .lte("date", priorMonthEndStr);

      if (priorErr) {
        console.warn("[forecast] Could not fetch prior month metrics:", priorErr.message);
      } else {
        priorMetrics = data ?? [];
      }
    } catch (fetchErr) {
      console.warn("[forecast] Exception fetching prior month metrics:", fetchErr);
    }

    const priorMonthRevenue = priorMetrics.reduce(
      (sum, m) => sum + (m.total_revenue_cents || 0),
      0
    );

    // Calculate daily average for current month (only count days with data)
    const currentMonthMetrics = recentMetrics.filter((m) => {
      const date = new Date(m.date);
      return date >= monthStart && date <= today;
    });

    const daysWithData = currentMonthMetrics.length;
    const dailyAvg = daysWithData > 0 ? Math.round(currentMonthRevenue / daysWithData) : 0;

    // Project month-end using linear extrapolation from daily average
    const projectedRevenue = currentMonthRevenue + dailyAvg * daysRemaining;

    // Calculate growth rate vs prior month (in percentage)
    let growthRate: number | null = null;
    if (priorMonthRevenue > 0) {
      growthRate = Math.round(((currentMonthRevenue - priorMonthRevenue) / priorMonthRevenue) * 100);
    }

    // Determine confidence level based on number of data points
    // High: 7+ days of data (about 25% of month), Medium: 3-6 days, Low: <3 days
    let confidence: "high" | "medium" | "low" = "low";
    if (daysWithData >= 7) {
      confidence = "high";
    } else if (daysWithData >= 3) {
      confidence = "medium";
    }

    return NextResponse.json<ForecastResponse>({
      current_revenue_cents: currentMonthRevenue,
      projected_revenue_cents: Math.round(projectedRevenue),
      growth_rate_pct: growthRate,
      daily_avg_cents: dailyAvg,
      days_remaining: daysRemaining,
      confidence,
    });
  } catch (error) {
    console.error("[forecast] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
