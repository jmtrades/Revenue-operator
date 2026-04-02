/**
 * GET /api/reports/digest?workspace_id=
 * Weekly Revenue Digest: aggregates platform intelligence into a single strategic report
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function prevMonthStart(d: Date): Date {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() - 1);
  return x;
}

function prevMonthEnd(d: Date): Date {
  return startOfMonth(d);
}

interface DigestResponse {
  period: { start: string; end: string; label: string };
  recovery_score: { score: number; grade: string; trend: "up" | "down" | "stable" };
  revenue: {
    recovered_cents: number;
    at_risk_cents: number;
    projected_month_end_cents: number;
    growth_pct: number | null;
    daily_avg_cents: number;
  };
  operations: {
    calls_handled: number;
    calls_trend_pct: number | null;
    appointments_booked: number;
    appointments_trend_pct: number | null;
    follow_ups_executed: number;
    follow_ups_trend_pct: number | null;
    hours_saved: number;
  };
  top_wins: Array<{ title: string; description: string; impact_cents: number }>;
  top_risks: Array<{ title: string; description: string; estimated_loss_cents: number }>;
  recommended_actions: Array<{ title: string; description: string; priority: number }>;
  campaigns: Array<{
    name: string;
    status: string;
    enrolled: number;
    booked: number;
    conversion_pct: number;
  }>;
  generated_at: string;
}

export async function GET(req: NextRequest): Promise<NextResponse<DigestResponse | { error: string } | unknown>> {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if (auth) return auth;

  const db = getDb();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevStart = prevMonthStart(now);
  const prevEnd = prevMonthEnd(now);

  const monthStartStr = monthStart.toISOString();
  const prevStartStr = prevStart.toISOString();
  const prevEndStr = prevEnd.toISOString();
  const monthStartDate = monthStart.toISOString().split("T")[0];
  const prevStartDate = prevStart.toISOString().split("T")[0];
  const prevEndDate = prevEnd.toISOString().split("T")[0];

  // ===== CURRENT MONTH METRICS =====
  let callsHandled = 0;
  let appointmentsBooked = 0;
  let followUpsSent = 0;
  let minutesUsed = 0;
  let revenueCents = 0;

  try {
    const { count: c } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", monthStartStr)
      .not("call_ended_at", "is", null);
    callsHandled = c ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const { count: a } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", monthStartStr)
      .in("status", ["confirmed", "completed"]);
    appointmentsBooked = a ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const { count: f } = await db
      .from("follow_up_queue")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("executed_at", monthStartStr)
      .eq("status", "sent");
    followUpsSent = f ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const { data: sessions } = await db
      .from("call_sessions")
      .select("call_started_at, call_ended_at")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", monthStartStr)
      .not("call_ended_at", "is", null)
      .limit(5000);
    if (sessions?.length) {
      for (const row of sessions) {
        const a = row.call_started_at ? new Date(row.call_started_at).getTime() : 0;
        const b = row.call_ended_at ? new Date(row.call_ended_at).getTime() : 0;
        if (b > a) minutesUsed += Math.ceil((b - a) / 60000);
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const { data: daily } = await db
      .from("daily_metrics")
      .select("total_revenue_cents, date")
      .eq("workspace_id", workspaceId)
      .gte("date", monthStartDate);
    if (daily?.length) {
      for (const row of daily) {
        const v = Number((row as { total_revenue_cents?: number }).total_revenue_cents);
        if (!Number.isNaN(v)) revenueCents += v;
      }
    }
  } catch {
    /* ignore */
  }

  // ===== PRIOR MONTH METRICS (for trend comparison) =====
  let callsHandledPrev = 0;
  let appointmentsBookedPrev = 0;
  let followUpsSentPrev = 0;
  let revenuecentsPrev = 0;

  try {
    const { count: c } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", prevStartStr)
      .lt("call_started_at", prevEndStr)
      .not("call_ended_at", "is", null);
    callsHandledPrev = c ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const { count: a } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", prevStartStr)
      .lt("created_at", prevEndStr)
      .in("status", ["confirmed", "completed"]);
    appointmentsBookedPrev = a ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const { count: f } = await db
      .from("follow_up_queue")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("executed_at", prevStartStr)
      .lt("executed_at", prevEndStr)
      .eq("status", "sent");
    followUpsSentPrev = f ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const { data: daily } = await db
      .from("daily_metrics")
      .select("total_revenue_cents, date")
      .eq("workspace_id", workspaceId)
      .gte("date", prevStartDate)
      .lt("date", prevEndDate);
    if (daily?.length) {
      for (const row of daily) {
        const v = Number((row as { total_revenue_cents?: number }).total_revenue_cents);
        if (!Number.isNaN(v)) revenuecentsPrev += v;
      }
    }
  } catch {
    /* ignore */
  }

  // ===== RISK METRICS =====
  let missedCalls = 0;
  let noShowsCount = 0;
  let staleLeadsCount = 0;

  try {
    const { count: mc } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", monthStartStr)
      .is("call_ended_at", null)
      .in("outcome", ["missed", "no_answer", "voicemail"]);
    missedCalls = mc ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const { count: ns } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "no_show")
      .gte("start_time", monthStartStr);
    noShowsCount = ns ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const staleDate = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: sl } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .lte("last_activity_at", staleDate)
      .not("state", "in", '("WON","LOST","CLOSED")');
    staleLeadsCount = sl ?? 0;
  } catch {
    /* ignore */
  }

  // ===== RECOVERY SCORE CALCULATION =====
  const conversionRate = callsHandled > 0 ? (appointmentsBooked / callsHandled) * 100 : 0;
  const followUpRate = missedCalls > 0 ? (followUpsSent / missedCalls) * 100 : 100;

  // Simplified recovery score: average of conversion, follow-up, and risk factors
  const riskFactor = Math.min(100, ((missedCalls + noShowsCount + staleLeadsCount) / Math.max(1, callsHandled)) * 50);
  const recoveryScore = Math.round((conversionRate * 0.4 + followUpRate * 0.4 + Math.max(0, 100 - riskFactor) * 0.2) / 100 * 100);

  function gradeScore(score: number): string {
    if (score >= 95) return "A+";
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    return "D";
  }

  // Trend: compare this month vs previous
  const prevRecoveryScore = Math.max(1, callsHandledPrev);
  const prevConversionRate = callsHandledPrev > 0 ? (appointmentsBookedPrev / callsHandledPrev) * 100 : 0;
  const prevRiskFactor = Math.min(100, (missedCalls / prevRecoveryScore) * 50);
  const prevScore = Math.round((prevConversionRate * 0.4 + 100 * 0.4 + Math.max(0, 100 - prevRiskFactor) * 0.2) / 100 * 100);

  const scoreTrend: "up" | "down" | "stable" =
    recoveryScore > prevScore + 5 ? "up" : recoveryScore < prevScore - 5 ? "down" : "stable";

  // ===== REVENUE INTELLIGENCE =====
  const revenueRecovered = appointmentsBooked * 25000; // 25000 cents per appointment
  const revenueAtRisk = (missedCalls + staleLeadsCount + noShowsCount) * 25000 * 0.15;

  // Days elapsed in month
  const daysElapsed = Math.ceil((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
  const dailyAvgCents = daysElapsed > 0 ? Math.round(revenueCents / daysElapsed) : 0;
  const daysInMonth = 30;
  const projectedMonthEnd = dailyAvgCents * daysInMonth;

  const growthPct =
    revenuecentsPrev > 0 ? Math.round(((revenueCents - revenuecentsPrev) / revenuecentsPrev) * 100) : revenueCents > 0 ? 100 : null;

  // ===== TOP WINS =====
  const topWins: Array<{ title: string; description: string; impact_cents: number }> = [];

  // Win 1: Highest conversion day/campaign
  if (appointmentsBooked > 0) {
    topWins.push({
      title: "Strong Appointment Conversion",
      description: `Booked ${appointmentsBooked} appointments this month, generating $${(revenueRecovered / 100).toFixed(2)} in recovery value.`,
      impact_cents: revenueRecovered,
    });
  }

  // Win 2: Follow-up execution
  if (followUpsSent > 0) {
    const followUpImpact = Math.round(followUpsSent * 1500); // ~15 cents value per follow-up
    topWins.push({
      title: "Proactive Follow-Up Execution",
      description: `Executed ${followUpsSent} follow-ups to keep leads warm and recover missed opportunities.`,
      impact_cents: followUpImpact,
    });
  }

  // Win 3: Time savings
  const timeSavingsCents = Math.round((minutesUsed / 60) * 50000); // Assume $500/hour value
  if (minutesUsed > 0) {
    topWins.push({
      title: "Operational Efficiency",
      description: `Handled ${callsHandled} calls in ${Math.round(minutesUsed / 60)} hours, enabling team focus on high-value activities.`,
      impact_cents: timeSavingsCents,
    });
  }

  // ===== TOP RISKS =====
  const topRisks: Array<{ title: string; description: string; estimated_loss_cents: number }> = [];

  if (missedCalls > 0) {
    topRisks.push({
      title: "Missed Calls (Revenue Gap)",
      description: `${missedCalls} calls went unanswered this month. Potential revenue leakage from lost lead engagement.`,
      estimated_loss_cents: missedCalls * 25000 * 0.15,
    });
  }

  if (staleLeadsCount > 0) {
    topRisks.push({
      title: "Stale Lead Pipeline",
      description: `${staleLeadsCount} leads inactive 7+ days. Risk of permanent disengagement and lost conversion opportunity.`,
      estimated_loss_cents: staleLeadsCount * 25000 * 0.1,
    });
  }

  if (noShowsCount > 0) {
    topRisks.push({
      title: "No-Show Appointments",
      description: `${noShowsCount} scheduled appointments missed. Each represents a confirmed opportunity that slipped.`,
      estimated_loss_cents: noShowsCount * 25000,
    });
  }

  // ===== RECOMMENDED ACTIONS =====
  const recommendedActions: Array<{ title: string; description: string; priority: number }> = [];

  if (conversionRate < 20) {
    recommendedActions.push({
      title: "Improve Conversion Pipeline",
      description: "Conversion rate below industry standard. Review call scripts and objection handling.",
      priority: 1,
    });
  }

  if (followUpRate < 80) {
    recommendedActions.push({
      title: "Increase Follow-Up Coverage",
      description: "Only following up on ~${Math.round(followUpRate)}% of missed opportunities.",
      priority: 1,
    });
  }

  if (staleLeadsCount > callsHandled * 0.1) {
    recommendedActions.push({
      title: "Re-engage Stale Leads",
      description: "Activate win-back campaign for inactive leads before they churn permanently.",
      priority: 2,
    });
  }

  // ===== CAMPAIGNS SUMMARY =====
  const campaigns: Array<{
    name: string;
    status: string;
    enrolled: number;
    booked: number;
    conversion_pct: number;
  }> = [];

  try {
    const { data: camps } = await db
      .from("campaigns")
      .select("id, name, status, total_contacts, appointments_booked")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .limit(10);

    if (camps?.length) {
      for (const c of camps) {
        const enrolled = Number(c.total_contacts) || 0;
        const booked = Number(c.appointments_booked) || 0;
        const conversion = enrolled > 0 ? Math.round((booked / enrolled) * 100) : 0;
        campaigns.push({
          name: (c.name as string) || "Campaign",
          status: c.status as string,
          enrolled,
          booked,
          conversion_pct: conversion,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // ===== BUILD RESPONSE =====
  const response: DigestResponse = {
    period: {
      start: monthStart.toISOString(),
      end: now.toISOString(),
      label: `Month of ${monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
    },
    recovery_score: {
      score: recoveryScore,
      grade: gradeScore(recoveryScore),
      trend: scoreTrend,
    },
    revenue: {
      recovered_cents: revenueCents,
      at_risk_cents: Math.round(revenueAtRisk),
      projected_month_end_cents: projectedMonthEnd,
      growth_pct: growthPct,
      daily_avg_cents: dailyAvgCents,
    },
    operations: {
      calls_handled: callsHandled,
      calls_trend_pct: callsHandledPrev > 0 ? Math.round(((callsHandled - callsHandledPrev) / callsHandledPrev) * 100) : callsHandled > 0 ? 100 : null,
      appointments_booked: appointmentsBooked,
      appointments_trend_pct: appointmentsBookedPrev > 0 ? Math.round(((appointmentsBooked - appointmentsBookedPrev) / appointmentsBookedPrev) * 100) : appointmentsBooked > 0 ? 100 : null,
      follow_ups_executed: followUpsSent,
      follow_ups_trend_pct: followUpsSentPrev > 0 ? Math.round(((followUpsSent - followUpsSentPrev) / followUpsSentPrev) * 100) : followUpsSent > 0 ? 100 : null,
      hours_saved: Math.round(minutesUsed / 60),
    },
    top_wins: topWins.slice(0, 3),
    top_risks: topRisks.slice(0, 3),
    recommended_actions: recommendedActions.slice(0, 3),
    campaigns,
    generated_at: now.toISOString(),
  };

  return NextResponse.json(response);
}
