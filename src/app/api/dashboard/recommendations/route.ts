/**
 * GET /api/dashboard/recommendations?workspace_id=
 * AI-powered recommendations/insights engine that analyzes key metrics
 * and generates actionable suggestions for operators.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

interface Recommendation {
  id: string;
  type: "warning" | "opportunity" | "success";
  title: string;
  description: string;
  action_label: string;
  action_url: string;
  priority: number; // 1-5, higher = more important
  estimated_impact_cents: number; // Revenue impact in cents
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dayOfWeek = x.getDay();
  const diff = x.getDate() - dayOfWeek;
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if (auth) return auth;

  const recommendations: Recommendation[] = [];
  let revenueAtRiskTotalCents = 0;

  try {
    const db = getDb();
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const weekStart = startOfWeek(now).toISOString();
    const monthStart = startOfMonth(now).toISOString();

    // Fetch key metrics
    let callsAnswered = 0;
    let appointmentsBooked = 0;
    let followUpsSent = 0;
    let missedCallsToday = 0;
    let noShowsThisWeek = 0;
    let staleLeadsCount = 0;

    // Calls answered this month
    try {
      const { count: c } = await db
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("call_started_at", monthStart)
        .not("call_ended_at", "is", null);
      callsAnswered = c ?? 0;
    } catch {
      // table missing
    }

    // Appointments booked this month
    try {
      const { count: a } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", monthStart)
        .in("status", ["confirmed", "completed"]);
      appointmentsBooked = a ?? 0;
    } catch {
      // table missing
    }

    // Follow-ups sent this month
    try {
      const { count: f } = await db
        .from("follow_up_logs")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("sent_at", monthStart);
      followUpsSent = f ?? 0;
    } catch {
      // table missing
    }

    // Missed calls today
    try {
      const { count: m } = await db
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("call_started_at", todayStart)
        .eq("missed", true);
      missedCallsToday = m ?? 0;
    } catch {
      // table missing
    }

    // No-shows this week
    try {
      const { count: ns } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", weekStart)
        .eq("status", "no_show");
      noShowsThisWeek = ns ?? 0;
    } catch {
      // table missing
    }

    // Stale leads (not contacted in 7+ days)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: sl } = await db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .not("state", "in", '("ARCHIVED","LOST","DISQUALIFIED")')
        .lt("last_contacted_at", sevenDaysAgo.toISOString());
      staleLeadsCount = sl ?? 0;
    } catch {
      // table missing
    }

    // Generate recommendations based on metric patterns
    const conversionRate =
      callsAnswered > 0 ? Math.round((appointmentsBooked / callsAnswered) * 100) : 0;
    const followUpRate = callsAnswered > 0 ? followUpsSent / callsAnswered : 0;

    // Low conversion rate warning
    if (callsAnswered > 5 && conversionRate < 10) {
      const estimatedMissedConversions = Math.round(callsAnswered * ((15 - conversionRate) / 100));
      const impactCents = estimatedMissedConversions * 3750; // 15% conversion × $250 lead value
      revenueAtRiskTotalCents += impactCents;
      recommendations.push({
        id: "low-conversion",
        type: "warning",
        title: "Low conversion rate detected",
        description: `~$${(impactCents / 100).toFixed(0)} at risk from ${conversionRate}% conversion rate. Adjusting qualifying questions could recover ~$${(estimatedMissedConversions * 3750 / 100).toFixed(0)}/month in missed appointments.`,
        action_label: "Optimize voice agent",
        action_url: "/app/agents",
        priority: 5,
        estimated_impact_cents: impactCents,
      });
    }

    // Missed calls opportunity
    if (missedCallsToday > 3) {
      const impactCents = missedCallsToday * 3750; // 15% conversion × $250 lead value
      revenueAtRiskTotalCents += impactCents;
      recommendations.push({
        id: "missed-calls-recovery",
        type: "warning",
        title: "Recover missed calls",
        description: `~$${(impactCents / 100).toFixed(0)} in potential revenue from ${missedCallsToday} missed calls today. Speed-to-lead recovery can capture 15-20% of these automatically.`,
        action_label: "Enable recovery",
        action_url: "/app/settings/call-rules",
        priority: 5,
        estimated_impact_cents: impactCents,
      });
    }

    // Stale leads opportunity
    if (staleLeadsCount > 5) {
      const impactCents = Math.round(staleLeadsCount * 3750); // 15% conversion × $250 lead value
      revenueAtRiskTotalCents += impactCents;
      recommendations.push({
        id: "stale-leads",
        type: "opportunity",
        title: "Reactivate stale leads",
        description: `~$${(impactCents / 100).toFixed(0)} sitting in ${staleLeadsCount} stale leads. A reactivation campaign could recover 15-20% of this with fresh outreach.`,
        action_label: "Create campaign",
        action_url: "/app/campaigns?type=reactivation",
        priority: 4,
        estimated_impact_cents: impactCents,
      });
    }

    // No-shows recovery
    if (noShowsThisWeek > 2) {
      const impactCents = noShowsThisWeek * 5000; // 20% rebook × $250 appointment value
      revenueAtRiskTotalCents += impactCents;
      recommendations.push({
        id: "no-shows-recovery",
        type: "warning",
        title: "Reduce no-shows",
        description: `~$${(impactCents / 100).toFixed(0)} at risk from ${noShowsThisWeek} no-shows this week. Automated recovery sequences can rebook 20-30% of these.`,
        action_label: "Setup sequences",
        action_url: "/app/sequences?type=no-show",
        priority: 4,
        estimated_impact_cents: impactCents,
      });
    }

    // Low follow-up rate opportunity
    if (callsAnswered > 10 && followUpRate < 0.3) {
      const followUpPct = Math.round(followUpRate * 100);
      const followUpGap = Math.round((0.8 - followUpRate) * callsAnswered);
      const impactCents = followUpGap * 3750; // 15% conversion × $250 lead value, monthly estimate
      revenueAtRiskTotalCents += impactCents;
      recommendations.push({
        id: "low-followup-rate",
        type: "opportunity",
        title: "Increase follow-up volume",
        description: `Increasing follow-up rate from ${followUpPct}% to 80% could recover ~$${(impactCents / 100).toFixed(0)}/month in missed conversions. Automated SMS and email sequences drive higher close rates.`,
        action_label: "Configure sequences",
        action_url: "/app/sequences",
        priority: 3,
        estimated_impact_cents: impactCents,
      });
    }

    // No activity warning
    if (callsAnswered === 0) {
      recommendations.push({
        id: "no-activity",
        type: "warning",
        title: "No calls received yet",
        description: `Your workspace has no calls this month. Set up your phone number to start capturing leads and revenue.`,
        action_label: "Check phone setup",
        action_url: "/app/settings/phone",
        priority: 5,
        estimated_impact_cents: 0,
      });
    }

    // Success metrics - at least one positive insight
    if (conversionRate >= 20 && callsAnswered > 0) {
      const monthlyRevenueGenerated = Math.round(appointmentsBooked * 25000 / 100); // appointments × $250
      recommendations.push({
        id: "strong-conversion",
        type: "success",
        title: "Strong conversion rate",
        description: `Your ${conversionRate}% conversion rate is generating ~$${(monthlyRevenueGenerated / 100).toFixed(0)}/month in appointment value. Excellent execution!`,
        action_label: "View performance",
        action_url: "/app/analytics",
        priority: 1,
        estimated_impact_cents: 0, // Success metric, no at-risk amount
      });
    } else if (followUpRate >= 0.5 && callsAnswered > 0) {
      recommendations.push({
        id: "strong-followups",
        type: "success",
        title: "Great follow-up discipline",
        description: `${Math.round(followUpRate * 100)}% of your calls get timely follow-ups, driving consistent revenue. Keep this momentum!`,
        action_label: "View sequence performance",
        action_url: "/app/sequences",
        priority: 1,
        estimated_impact_cents: 0, // Success metric
      });
    } else if (appointmentsBooked > 0 && missedCallsToday === 0) {
      recommendations.push({
        id: "no-missed-calls",
        type: "success",
        title: "Excellent call responsiveness",
        description: `Zero missed calls today. This consistency protects your revenue potential—keep it up!`,
        action_label: "View call logs",
        action_url: "/app/calls",
        priority: 1,
        estimated_impact_cents: 0, // Success metric
      });
    }

    // Sort by priority descending
    recommendations.sort((a, b) => b.priority - a.priority);

    return NextResponse.json({
      recommendations,
      revenue_at_risk_total_cents: revenueAtRiskTotalCents,
    });
  } catch (error) {
    // Silent error handling - return empty recommendations on any error
    return NextResponse.json([]);
  }
}
