/**
 * GET /api/analytics/roi
 * Calculates ROI metrics for the workspace.
 * Query params: workspace_id, range (7d|30d|90d)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

type LeadBySource = {
  source: string;
  count: number;
  revenue: number;
};

type MonthlyTrend = {
  month: string;
  revenue: number;
  cost: number;
  roi: number;
};

type ROIResponse = {
  total_revenue_attributed: number;
  total_cost: number;
  roi_percentage: number;
  cost_per_lead: number;
  cost_per_appointment: number;
  cost_per_conversion: number;
  revenue_per_call: number;
  time_saved_hours: number;
  leads_by_source: LeadBySource[];
  monthly_trend: MonthlyTrend[];
};

function getRangeStart(range: string): Date {
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

function getMonthKey(date: Date): string {
  return date.toISOString().substring(0, 7);
}

function estimateCallCost(durationSeconds: number): number {
  // Estimate: $0.05 per minute
  const minutes = durationSeconds / 60;
  return Math.round(minutes * 5) / 100;
}

function estimateTimeSaved(callDurationSeconds: number): number {
  // Estimate: saves 80% of manual work time
  const minutes = callDurationSeconds / 60;
  return minutes * 0.8 / 60;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  const range = req.nextUrl.searchParams.get("range") || "30d";

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const rangeStart = getRangeStart(range);

    // Fetch calls
    const { data: calls } = await db
      .from("call_sessions")
      .select("id, call_started_at, call_ended_at, lead_id")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", rangeStart.toISOString())
      .not("call_ended_at", "is", null);

    const callIds = (calls ?? []).map((c) => c.id as string);
    const leadIds = [...new Set((calls ?? []).map((c) => c.lead_id as string).filter(Boolean))];

    // Fetch leads with source information
    let leadsData: Array<{
      id: string;
      source?: string | null;
      estimated_value?: number | null;
      created_at: string;
    }> = [];
    if (leadIds.length > 0) {
      const { data } = await db
        .from("leads")
        .select("id, source, estimated_value, created_at")
        .in("id", leadIds);
      leadsData = data ?? [];
    }

    // Fetch deals/revenue information
    let dealsData: Array<{
      lead_id: string;
      value_cents?: number | null;
      created_at: string;
    }> = [];
    if (leadIds.length > 0) {
      const { data } = await db
        .from("deals")
        .select("lead_id, value_cents, created_at")
        .in("lead_id", leadIds)
        .in("status", ["won", "closed"]);
      dealsData = data ?? [];
    }

    // Fetch appointments for conversion tracking
    const { data: appointments } = await db
      .from("appointments")
      .select("id, call_session_id, created_at, status")
      .eq("workspace_id", workspaceId)
      .gte("created_at", rangeStart.toISOString());

    // Calculate metrics
    let totalRevenue = 0;
    let totalCost = 0;
    let totalTimeSavedHours = 0;

    const leadBySourceMap: Record<string, { count: number; revenue: number }> = {};
    const monthlyMap: Record<string, { revenue: number; cost: number; appointments: number }> = {};

    // Process calls for cost and time
    for (const call of calls ?? []) {
      const startedAt = new Date(call.call_started_at as string);
      const endedAt = new Date(call.call_ended_at as string);
      const durationSeconds = Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 1000);

      const callCost = estimateCallCost(durationSeconds);
      totalCost += callCost;
      totalTimeSavedHours += estimateTimeSaved(durationSeconds);

      const monthKey = getMonthKey(startedAt);
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { revenue: 0, cost: 0, appointments: 0 };
      }
      monthlyMap[monthKey].cost += callCost;
    }

    // Process deals for revenue
    for (const deal of dealsData) {
      const value = (deal.value_cents ?? 0) / 100;
      totalRevenue += value;

      const leadId = deal.lead_id;
      const lead = leadsData.find((l) => l.id === leadId);

      if (lead?.source) {
        if (!leadBySourceMap[lead.source]) {
          leadBySourceMap[lead.source] = { count: 0, revenue: 0 };
        }
        leadBySourceMap[lead.source].revenue += value;
      }

      const monthKey = getMonthKey(new Date(deal.created_at));
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { revenue: 0, cost: 0, appointments: 0 };
      }
      monthlyMap[monthKey].revenue += value;
    }

    // Process leads by source
    for (const lead of leadsData) {
      if (lead.source) {
        if (!leadBySourceMap[lead.source]) {
          leadBySourceMap[lead.source] = { count: 0, revenue: 0 };
        }
        leadBySourceMap[lead.source].count++;
      }
    }

    // Process appointments for monthly trend
    for (const appt of appointments ?? []) {
      const createdAt = new Date(appt.created_at);
      const monthKey = getMonthKey(createdAt);
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { revenue: 0, cost: 0, appointments: 0 };
      }
      if (appt.status === "confirmed" || appt.status === "completed") {
        monthlyMap[monthKey].appointments++;
      }
    }

    // Calculate derived metrics
    const totalLeads = leadsData.length;
    const totalAppointments = (appointments ?? []).filter(
      (a) => a.status === "confirmed" || a.status === "completed"
    ).length;
    const totalCalls = callIds.length;

    const costPerLead = totalLeads > 0 ? totalCost / totalLeads : 0;
    const costPerAppointment = totalAppointments > 0 ? totalCost / totalAppointments : 0;
    const costPerConversion = totalLeads > 0 ? totalCost / totalLeads : 0;
    const revenuePerCall = totalCalls > 0 ? totalRevenue / totalCalls : 0;

    const roiPercentage =
      totalCost > 0
        ? Math.round(((totalRevenue - totalCost) / totalCost) * 100 * 100) / 100
        : totalRevenue > 0
          ? 999
          : 0;

    // Format leads by source
    const leadsBySource: LeadBySource[] = Object.entries(leadBySourceMap)
      .map(([source, data]) => ({
        source,
        count: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Format monthly trend
    const monthlyTrend: MonthlyTrend[] = Object.entries(monthlyMap)
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        roi:
          data.cost > 0
            ? Math.round(((data.revenue - data.cost) / data.cost) * 100 * 100) / 100
            : data.revenue > 0
              ? 999
              : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const response: ROIResponse = {
      total_revenue_attributed: Math.round(totalRevenue * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      roi_percentage: roiPercentage,
      cost_per_lead: Math.round(costPerLead * 100) / 100,
      cost_per_appointment: Math.round(costPerAppointment * 100) / 100,
      cost_per_conversion: Math.round(costPerConversion * 100) / 100,
      revenue_per_call: Math.round(revenuePerCall * 100) / 100,
      time_saved_hours: Math.round(totalTimeSavedHours * 100) / 100,
      leads_by_source: leadsBySource,
      monthly_trend: monthlyTrend,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[analytics/roi]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
