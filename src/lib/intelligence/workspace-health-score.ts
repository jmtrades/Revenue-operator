/**
 * Workspace Health Score — Quantifies how well Revenue Operator is performing.
 *
 * This score is THE stickiness metric. When a user sees:
 * "Revenue Operator recovered $47,820 this month. Health Score: 92/100."
 * They will never cancel.
 *
 * Categories:
 * 1. Call Coverage (0-25): Are all calls being answered?
 * 2. Revenue Recovery (0-25): How much leaked revenue is being recovered?
 * 3. Automation Efficiency (0-25): Are campaigns and sequences running?
 * 4. Intelligence Quality (0-25): Is lead scoring/routing improving outcomes?
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export interface HealthScoreBreakdown {
  callCoverage: number;       // 0-25
  revenueRecovery: number;    // 0-25
  automationEfficiency: number; // 0-25
  intelligenceQuality: number;  // 0-25
}

export interface WorkspaceHealth {
  workspaceId: string;
  generatedAt: string;
  overallScore: number;       // 0-100
  breakdown: HealthScoreBreakdown;
  monthlyRecoveredRevenue: number;
  monthlyCallsHandled: number;
  monthlyAppointmentsBooked: number;
  monthlyLeadsConverted: number;
  trend: "improving" | "stable" | "declining";
  insights: string[];
}

export async function computeWorkspaceHealth(workspaceId: string): Promise<WorkspaceHealth> {
  const db = getDb();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let callCoverage = 0;
  let revenueRecovery = 0;
  let automationEfficiency = 0;
  let intelligenceQuality = 0;
  const insights: string[] = [];
  let monthlyRecoveredRevenue = 0;
  let monthlyCallsHandled = 0;
  let monthlyAppointmentsBooked = 0;
  let monthlyLeadsConverted = 0;

  // ── Call Coverage (0-25) ──
  try {
    const { count: totalCalls } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", startOfMonth.toISOString());

    const { count: answeredCalls } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .gte("call_started_at", startOfMonth.toISOString());

    monthlyCallsHandled = answeredCalls ?? 0;
    const total = totalCalls ?? 0;
    if (total > 0) {
      const rate = (answeredCalls ?? 0) / total;
      callCoverage = Math.round(rate * 25);
      if (rate >= 0.98) insights.push("Exceptional call coverage — virtually zero missed calls");
      else if (rate < 0.80) insights.push("Call coverage below 80% — enable 24/7 AI Agent to close the gap");
    } else {
      callCoverage = 12; // Neutral if no calls yet
    }
  } catch (e) {
    log("warn", "health_score.call_coverage_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // ── Revenue Recovery (0-25) ──
  try {
    const { data: deals } = await db
      .from("deals")
      .select("value_cents, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "won")
      .gte("updated_at", startOfMonth.toISOString());

    const wonRevenue = ((deals ?? []) as { value_cents?: number }[])
      .reduce((sum, d) => sum + (d.value_cents ?? 0), 0);
    monthlyRecoveredRevenue = Math.round(wonRevenue / 100);

    // Compare to last month
    const { data: lastMonthDeals } = await db
      .from("deals")
      .select("value_cents")
      .eq("workspace_id", workspaceId)
      .eq("status", "won")
      .gte("updated_at", startOfLastMonth.toISOString())
      .lt("updated_at", startOfMonth.toISOString());

    const lastMonthRevenue = ((lastMonthDeals ?? []) as { value_cents?: number }[])
      .reduce((sum, d) => sum + (d.value_cents ?? 0), 0);

    if (wonRevenue > 0) {
      const growth = lastMonthRevenue > 0 ? ((wonRevenue - lastMonthRevenue) / lastMonthRevenue) : 0;
      revenueRecovery = Math.min(25, Math.round(15 + growth * 10));
      if (growth > 0.2) insights.push(`Revenue up ${Math.round(growth * 100)}% vs last month`);
    } else {
      revenueRecovery = 5;
    }
  } catch (e) {
    log("warn", "health_score.revenue_recovery_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // ── Automation Efficiency (0-25) ──
  try {
    const { count: activeCampaigns } = await db
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    const { count: activeAgents } = await db
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    const { count: appointments } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("outcome", "appointment_booked")
      .gte("call_started_at", startOfMonth.toISOString());

    monthlyAppointmentsBooked = appointments ?? 0;

    const automationLevel = Math.min(25,
      ((activeCampaigns ?? 0) > 0 ? 8 : 0) +
      ((activeAgents ?? 0) > 0 ? 8 : 0) +
      Math.min(9, (appointments ?? 0)),
    );
    automationEfficiency = automationLevel;

    if ((activeCampaigns ?? 0) === 0) insights.push("No active campaigns — set up outbound to maximize revenue");
    if ((appointments ?? 0) > 10) insights.push(`${appointments} appointments booked autonomously this month`);
  } catch (e) {
    log("warn", "health_score.automation_efficiency_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // ── Intelligence Quality (0-25) ──
  try {
    const { count: convertedLeads } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("status", ["WON", "BOOKED", "SHOWED"])
      .gte("last_activity_at", startOfMonth.toISOString());

    const { count: totalLeads } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", startOfMonth.toISOString());

    monthlyLeadsConverted = convertedLeads ?? 0;

    if ((totalLeads ?? 0) > 0) {
      const convRate = (convertedLeads ?? 0) / (totalLeads ?? 0);
      intelligenceQuality = Math.min(25, Math.round(convRate * 100));
      if (convRate > 0.30) insights.push("Lead conversion rate above 30% — outperforming industry average");
    } else {
      intelligenceQuality = 10;
    }
  } catch (e) {
    log("warn", "health_score.intelligence_quality_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  const overallScore = callCoverage + revenueRecovery + automationEfficiency + intelligenceQuality;

  // Determine trend
  let trend: "improving" | "stable" | "declining" = "stable";
  if (overallScore > 70) trend = "improving";
  else if (overallScore < 40) trend = "declining";

  if (overallScore >= 85) insights.unshift("Your revenue operations are performing at elite level");
  else if (overallScore < 50) insights.unshift("Significant revenue is being left on the table — activate more features");

  return {
    workspaceId,
    generatedAt: now.toISOString(),
    overallScore,
    breakdown: { callCoverage, revenueRecovery, automationEfficiency, intelligenceQuality },
    monthlyRecoveredRevenue,
    monthlyCallsHandled,
    monthlyAppointmentsBooked,
    monthlyLeadsConverted,
    trend,
    insights: insights.slice(0, 5),
  };
}
