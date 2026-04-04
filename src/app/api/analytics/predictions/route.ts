/**
 * GET /api/analytics/predictions
 * AI-powered predictions for the workspace.
 * Query params: workspace_id
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

type ChurnRiskLead = {
  lead_id: string;
  lead_name: string;
  risk_score: number;
  last_activity: string;
};

type GrowthOpportunity = {
  description: string;
  estimated_impact: string;
  priority: "high" | "medium" | "low";
};

type PredictionsResponse = {
  predicted_conversions_next_30d: number;
  predicted_revenue_next_30d: number;
  churn_risk_leads: ChurnRiskLead[];
  growth_opportunities: GrowthOpportunity[];
};

function calculateRiskScore(
  daysSinceActivity: number | null,
  engagementLevel: string | null,
  conversionHistory: number
): number {
  let score = 50;

  // Inactivity penalty
  if (daysSinceActivity !== null) {
    if (daysSinceActivity > 30) score += 30;
    else if (daysSinceActivity > 14) score += 15;
  }

  // Engagement penalty
  if (engagementLevel === "low") score += 20;
  else if (engagementLevel === "medium") score += 5;

  // Recent conversions reduce risk
  if (conversionHistory > 0) score -= 10;

  return Math.min(100, Math.max(0, score));
}

function predictConversions(
  recentCallsCount: number,
  conversionRate: number,
  avgCallDuration: number
): number {
  // Linear extrapolation over 30 days
  const dailyRate = recentCallsCount / 7; // assume last 7 days
  const predicted30DaysCalls = dailyRate * 30;
  return Math.round(predicted30DaysCalls * conversionRate);
}

function predictRevenue(predictedConversions: number, avgRevenuePerConversion: number): number {
  return Math.round(predictedConversions * avgRevenuePerConversion * 100) / 100;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch recent calls for baseline metrics
    const { data: recentCalls } = await db
      .from("call_sessions")
      .select("id, lead_id, call_started_at, call_ended_at")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", sevenDaysAgo.toISOString());

    const recentCallsCount = (recentCalls ?? []).length;

    // Fetch all active leads
    const { data: leads } = await db
      .from("leads")
      .select("id, name, last_activity_at, state")
      .eq("workspace_id", workspaceId)
      .in("state", ["ENGAGED", "QUALIFIED", "CONTACTED"]);

    // Fetch deals for conversion history and revenue
    const { data: deals } = await db
      .from("deals")
      .select("lead_id, value_cents, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["won", "closed", "confirmed"]);

    // Fetch appointments for conversion rate
    const { data: appointments } = await db
      .from("appointments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .in("status", ["confirmed", "completed"]);

    const appointmentsCount = (appointments ?? []).length;
    const conversionRate = recentCallsCount > 0 ? appointmentsCount / recentCallsCount : 0;

    // Calculate average revenue per conversion
    const totalRevenue = (deals ?? []).reduce((sum, d) => sum + ((d.value_cents ?? 0) / 100), 0);
    const dealsCount = (deals ?? []).length;
    const avgRevenuePerConversion = dealsCount > 0 ? totalRevenue / dealsCount : 500; // default estimate

    // Predict conversions and revenue
    const predictedConversions = predictConversions(recentCallsCount, conversionRate, 0);
    const predictedRevenue = predictRevenue(predictedConversions, avgRevenuePerConversion);

    // Identify churn risk leads
    const now = new Date();
    const dealMap = (deals ?? []).reduce(
      (acc, d) => {
        if (!acc[d.lead_id]) acc[d.lead_id] = [];
        acc[d.lead_id].push(d);
        return acc;
      },
      {} as Record<string, Array<{ lead_id: string; value_cents: number | null; status: string }>>
    );

    const churnRiskLeads: ChurnRiskLead[] = [];

    for (const lead of leads ?? []) {
      const lastActivity = lead.last_activity_at ? new Date(lead.last_activity_at) : null;
      const daysSinceActivity = lastActivity
        ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const recentConversions = (dealMap[lead.id] ?? []).filter((d) => d.status === "won").length;

      const riskScore = calculateRiskScore(daysSinceActivity, lead.state as string | null, recentConversions);

      if (riskScore >= 60) {
        churnRiskLeads.push({
          lead_id: lead.id,
          lead_name: lead.name ?? "Unknown",
          risk_score: Math.round(riskScore),
          last_activity: lastActivity?.toISOString() ?? "never",
        });
      }
    }

    churnRiskLeads.sort((a, b) => b.risk_score - a.risk_score).splice(0, 10);

    // Identify growth opportunities
    const growthOpportunities: GrowthOpportunity[] = [];

    // Opportunity 1: High conversion rate bottleneck
    if (conversionRate > 0.3 && appointmentsCount < 50) {
      growthOpportunities.push({
        description: "Increase call volume to leverage strong conversion rate",
        estimated_impact: "Could add $2,000-5,000 monthly revenue",
        priority: "high",
      });
    }

    // Opportunity 2: Low conversion rate improvement
    if (conversionRate < 0.15 && recentCallsCount > 10) {
      growthOpportunities.push({
        description: "Refine talk tracks to improve conversion performance",
        estimated_impact: "Could improve conversion by 5-10%",
        priority: "high",
      });
    }

    // Opportunity 3: Churn prevention
    if (churnRiskLeads.length > 5) {
      growthOpportunities.push({
        description: "Re-engage inactive leads to reduce churn",
        estimated_impact: "Could recover $1,000-3,000 in revenue",
        priority: "medium",
      });
    }

    // Opportunity 4: Lead quality
    if (dealsCount > 0 && totalRevenue / dealsCount < 1000) {
      growthOpportunities.push({
        description: "Focus on higher-value lead segments",
        estimated_impact: "Could increase deal value by 20-30%",
        priority: "medium",
      });
    }

    // Opportunity 5: Agent performance
    if (recentCallsCount > 0) {
      growthOpportunities.push({
        description: "Share winning talk tracks with team to standardize success",
        estimated_impact: "Could improve team conversion by 10-15%",
        priority: "low",
      });
    }

    const response: PredictionsResponse = {
      predicted_conversions_next_30d: Math.max(0, predictedConversions),
      predicted_revenue_next_30d: Math.max(0, predictedRevenue),
      churn_risk_leads: churnRiskLeads,
      growth_opportunities: growthOpportunities,
    };

    return NextResponse.json(response);
  } catch (error) {
    log("error", "analytics.predictions.GET", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
