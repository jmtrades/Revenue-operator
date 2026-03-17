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

export type DailyMetricRow = {
  id: string;
  workspace_id: string;
  date: string;
  calls_answered: number;
  calls_missed: number;
  appointments_booked: number;
  no_shows: number;
  no_shows_recovered: number;
  follow_ups_sent: number;
  leads_captured: number;
  revenue_estimated_cents: number;
  response_time_avg_seconds: number | null;
  created_at: string;
  updated_at: string;
};

export type MetricsResponse = {
  metrics: DailyMetricRow[];
  totals: {
    calls_answered: number;
    calls_missed: number;
    appointments_booked: number;
    no_shows: number;
    no_shows_recovered: number;
    follow_ups_sent: number;
    leads_captured: number;
    revenue_estimated_cents: number;
    response_time_avg_seconds: number | null;
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (metrics ?? []) as DailyMetricRow[];

    // Calculate totals
    const totals = {
      calls_answered: 0,
      calls_missed: 0,
      appointments_booked: 0,
      no_shows: 0,
      no_shows_recovered: 0,
      follow_ups_sent: 0,
      leads_captured: 0,
      revenue_estimated_cents: 0,
      response_time_avg_seconds: null as number | null,
    };

    const responseTimes: number[] = [];
    for (const row of rows) {
      totals.calls_answered += row.calls_answered;
      totals.calls_missed += row.calls_missed;
      totals.appointments_booked += row.appointments_booked;
      totals.no_shows += row.no_shows;
      totals.no_shows_recovered += row.no_shows_recovered;
      totals.follow_ups_sent += row.follow_ups_sent;
      totals.leads_captured += row.leads_captured;
      totals.revenue_estimated_cents += row.revenue_estimated_cents;
      if (row.response_time_avg_seconds !== null) {
        responseTimes.push(row.response_time_avg_seconds);
      }
    }

    // Calculate average response time (average of daily averages)
    if (responseTimes.length > 0) {
      totals.response_time_avg_seconds = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
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
    console.error("Failed to fetch metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
