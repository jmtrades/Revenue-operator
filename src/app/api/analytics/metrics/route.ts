/**
 * GET /api/analytics/metrics
 * Returns daily_metrics for a workspace and date range.
 * Query params: workspace_id, start_date, end_date (ISO 8601 format)
 * Returns: array of daily_metrics + totals summary
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export type DailyMetricRow = {
  id: string;
  workspace_id: string;
  date: string;
  total_calls: number;
  total_leads: number;
  total_appointments: number;
  total_revenue_cents: number;
  avg_call_duration_seconds: number;
  missed_calls: number;
  recovered_calls: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type MetricsResponse = {
  metrics: DailyMetricRow[];
  totals: {
    total_calls: number;
    total_leads: number;
    total_appointments: number;
    total_revenue_cents: number;
    avg_call_duration_seconds: number | null;
    missed_calls: number;
    recovered_calls: number;
    date_range_days: number;
  };
};

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  const startDate = req.nextUrl.searchParams.get("start_date");
  const endDate = req.nextUrl.searchParams.get("end_date");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "start_date and end_date required (ISO 8601)" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json({ error: "Dates must be in YYYY-MM-DD format" }, { status: 400 });
    }

    // Fetch metrics for date range (inclusive on both ends)
    const { data: metrics, error } = await db
      .from("daily_metrics")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    const rows = (metrics ?? []) as DailyMetricRow[];

    // Calculate totals
    const totals = {
      total_calls: 0,
      total_leads: 0,
      total_appointments: 0,
      total_revenue_cents: 0,
      avg_call_duration_seconds: null as number | null,
      missed_calls: 0,
      recovered_calls: 0,
    };

    const durations: number[] = [];
    for (const row of rows) {
      totals.total_calls += row.total_calls ?? 0;
      totals.total_leads += row.total_leads ?? 0;
      totals.total_appointments += row.total_appointments ?? 0;
      totals.total_revenue_cents += row.total_revenue_cents ?? 0;
      totals.missed_calls += row.missed_calls ?? 0;
      totals.recovered_calls += row.recovered_calls ?? 0;
      if (row.avg_call_duration_seconds != null && row.avg_call_duration_seconds > 0) {
        durations.push(row.avg_call_duration_seconds);
      }
    }

    // Calculate average call duration (average of daily averages)
    if (durations.length > 0) {
      totals.avg_call_duration_seconds = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }

    // Calculate date range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const dateRangeDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const response: MetricsResponse = {
      metrics: rows,
      totals: {
        ...totals,
        date_range_days: dateRangeDays,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    log("error", "[analytics/metrics]", { error: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
