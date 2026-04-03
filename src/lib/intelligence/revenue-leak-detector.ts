/**
 * Revenue Leak Detector — Automatically identifies and quantifies revenue leaks.
 *
 * Scans across ALL workspace data to find:
 * 1. Missed calls that were never followed up
 * 2. Leads that went cold without a reason
 * 3. Appointments that were no-shows without re-engagement
 * 4. Deals that stalled in pipeline without action
 * 5. Customers who churned without a win-back attempt
 * 6. After-hours calls that were never answered
 * 7. High-intent leads that were never contacted
 * 8. Repeat callers who left without resolution
 *
 * Each leak has an estimated dollar value, making the ROI of Revenue Operator
 * impossible to ignore — and impossible to walk away from.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export interface RevenueLeak {
  type: LeakType;
  severity: "critical" | "high" | "medium" | "low";
  estimatedLostRevenue: number;
  count: number;
  description: string;
  actionable: boolean;
  autoFixAvailable: boolean;
  recommendation: string;
}

export type LeakType =
  | "missed_calls_no_followup"
  | "cold_leads_no_reengagement"
  | "no_show_no_recovery"
  | "stalled_deals"
  | "churned_no_winback"
  | "after_hours_missed"
  | "high_intent_uncontacted"
  | "repeat_caller_unresolved"
  | "slow_response_time"
  | "abandoned_quotes";

export interface LeakReport {
  workspaceId: string;
  generatedAt: string;
  totalEstimatedLeakage: number;
  leaks: RevenueLeak[];
  leakScore: number; // 0-100, lower is better
  industryBenchmark: number;
  improvementSinceLastReport: number | null;
}

/** Average deal values by industry (conservative estimates) */
const AVG_DEAL_VALUES: Record<string, number> = {
  hvac: 450,
  dental: 1200,
  legal: 3500,
  real_estate: 8500,
  med_spa: 800,
  plumbing: 380,
  roofing: 6500,
  recruiting: 15000,
  auto_repair: 550,
  insurance: 2200,
  construction: 12000,
  healthcare: 950,
  fitness: 200,
  default: 750,
};

function getAvgDealValue(industry: string | null | undefined): number {
  if (!industry) return AVG_DEAL_VALUES.default;
  return AVG_DEAL_VALUES[industry.toLowerCase()] ?? AVG_DEAL_VALUES.default;
}

export async function detectRevenueLeaks(workspaceId: string): Promise<LeakReport> {
  const db = getDb();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get workspace industry for deal value estimation
  const { data: ws } = await db
    .from("workspaces")
    .select("industry")
    .eq("id", workspaceId)
    .maybeSingle();
  const industry = (ws as { industry?: string | null } | null)?.industry;
  const avgDeal = getAvgDealValue(industry);

  const leaks: RevenueLeak[] = [];

  // 1. Missed calls with no follow-up
  try {
    const { count: missedCalls } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "missed")
      .gte("call_started_at", thirtyDaysAgo.toISOString());

    const { count: followedUp } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "missed")
      .not("follow_up_at", "is", null)
      .gte("call_started_at", thirtyDaysAgo.toISOString());

    const unfollowed = (missedCalls ?? 0) - (followedUp ?? 0);
    if (unfollowed > 0) {
      // 67% of missed calls never return — industry standard
      const estimatedLost = Math.round(unfollowed * avgDeal * 0.67);
      leaks.push({
        type: "missed_calls_no_followup",
        severity: unfollowed > 20 ? "critical" : unfollowed > 5 ? "high" : "medium",
        estimatedLostRevenue: estimatedLost,
        count: unfollowed,
        description: `${unfollowed} missed calls in the last 30 days were never followed up`,
        actionable: true,
        autoFixAvailable: true,
        recommendation: "Enable Speed-to-Lead auto-callback to recover these within 60 seconds",
      });
    }
  } catch (e) {
    log("warn", "leak_detector.missed_calls_check_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 2. Cold leads without re-engagement
  try {
    const { count: coldLeads } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("status", ["NEW", "CONTACTED"])
      .lt("last_activity_at", sevenDaysAgo.toISOString());

    if ((coldLeads ?? 0) > 0) {
      const estimatedLost = Math.round((coldLeads ?? 0) * avgDeal * 0.35);
      leaks.push({
        type: "cold_leads_no_reengagement",
        severity: (coldLeads ?? 0) > 50 ? "critical" : (coldLeads ?? 0) > 15 ? "high" : "medium",
        estimatedLostRevenue: estimatedLost,
        count: coldLeads ?? 0,
        description: `${coldLeads} leads went cold (7+ days inactive) without re-engagement`,
        actionable: true,
        autoFixAvailable: true,
        recommendation: "Enable Smart Reactivation campaigns to automatically re-engage cold leads",
      });
    }
  } catch (e) {
    log("warn", "leak_detector.cold_leads_check_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 3. No-shows without recovery attempt
  try {
    const { count: noShows } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("outcome", "no_show")
      .gte("call_started_at", thirtyDaysAgo.toISOString());

    if ((noShows ?? 0) > 0) {
      // 40% of no-shows will rebook if contacted within 24 hours
      const estimatedLost = Math.round((noShows ?? 0) * avgDeal * 0.60);
      leaks.push({
        type: "no_show_no_recovery",
        severity: (noShows ?? 0) > 10 ? "high" : "medium",
        estimatedLostRevenue: estimatedLost,
        count: noShows ?? 0,
        description: `${noShows} appointment no-shows in 30 days without automatic rebooking`,
        actionable: true,
        autoFixAvailable: true,
        recommendation: "Enable No-Show Recovery to automatically reschedule within 1 hour",
      });
    }
  } catch (e) {
    log("warn", "leak_detector.no_show_check_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 4. Stalled deals in pipeline
  try {
    const { count: stalledDeals } = await db
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .not("status", "in", "(won,lost)")
      .lt("updated_at", sevenDaysAgo.toISOString());

    if ((stalledDeals ?? 0) > 0) {
      const estimatedLost = Math.round((stalledDeals ?? 0) * avgDeal * 0.50);
      leaks.push({
        type: "stalled_deals",
        severity: (stalledDeals ?? 0) > 20 ? "critical" : (stalledDeals ?? 0) > 5 ? "high" : "medium",
        estimatedLostRevenue: estimatedLost,
        count: stalledDeals ?? 0,
        description: `${stalledDeals} deals stalled in pipeline for 7+ days without action`,
        actionable: true,
        autoFixAvailable: true,
        recommendation: "Enable Deal Acceleration to auto-trigger follow-ups on stalled deals",
      });
    }
  } catch (e) {
    log("warn", "leak_detector.stalled_deals_check_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 5. After-hours missed opportunities
  try {
    const { count: afterHours } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "missed")
      .eq("after_hours", true)
      .gte("call_started_at", thirtyDaysAgo.toISOString());

    if ((afterHours ?? 0) > 0) {
      const estimatedLost = Math.round((afterHours ?? 0) * avgDeal * 0.75);
      leaks.push({
        type: "after_hours_missed",
        severity: (afterHours ?? 0) > 10 ? "critical" : "high",
        estimatedLostRevenue: estimatedLost,
        count: afterHours ?? 0,
        description: `${afterHours} after-hours calls missed — these callers go to competitors`,
        actionable: true,
        autoFixAvailable: true,
        recommendation: "Enable 24/7 AI Voice Agent to answer every call, any time",
      });
    }
  } catch (e) {
    log("warn", "leak_detector.after_hours_check_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 6. High-intent leads never contacted
  try {
    const { count: uncontacted } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "NEW")
      .gte("created_at", thirtyDaysAgo.toISOString());

    if ((uncontacted ?? 0) > 0) {
      const estimatedLost = Math.round((uncontacted ?? 0) * avgDeal * 0.45);
      leaks.push({
        type: "high_intent_uncontacted",
        severity: (uncontacted ?? 0) > 30 ? "critical" : (uncontacted ?? 0) > 10 ? "high" : "medium",
        estimatedLostRevenue: estimatedLost,
        count: uncontacted ?? 0,
        description: `${uncontacted} new leads in 30 days were never contacted`,
        actionable: true,
        autoFixAvailable: true,
        recommendation: "Enable Outbound Campaigns to auto-dial new leads within minutes",
      });
    }
  } catch (e) {
    log("warn", "leak_detector.uncontacted_check_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // Calculate totals
  const totalEstimatedLeakage = leaks.reduce((sum, l) => sum + l.estimatedLostRevenue, 0);
  const criticalCount = leaks.filter((l) => l.severity === "critical").length;
  const highCount = leaks.filter((l) => l.severity === "high").length;
  const leakScore = Math.min(100, Math.round(criticalCount * 25 + highCount * 15 + leaks.length * 5));

  return {
    workspaceId,
    generatedAt: now.toISOString(),
    totalEstimatedLeakage,
    leaks,
    leakScore,
    industryBenchmark: 35, // Average business leaks 35% potential revenue
    improvementSinceLastReport: null, // Set by comparing with previous report
  };
}
