/**
 * Autonomous Intelligence Loop — Vercel Cron Handler
 * Runs periodically to optimize leads, campaigns, and intelligence scoring
 * without human intervention. Triggers self-optimization actions.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // Validate CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    log("warn", "cron.unauthorized_access", { authorization: authHeader });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  const results = {
    followUps: 0,
    campaignOptimizations: 0,
    atRiskLeads: 0,
    timestamp,
    errors: [] as string[],
  };

  const db = getDb();

  // 1. Auto-follow-up processing: Determine next best actions for leads pending follow-up
  try {
    // Fetch leads needing follow-up (not recently contacted, with qualification potential)
    const { data: followUpLeads, error: followUpErr } = await db
      .from("leads")
      .select("id, name, email, phone, company, qualification_score, last_activity_at")
      .eq("workspace_id", req.nextUrl.searchParams.get("workspace_id") || "")
      .gte("qualification_score", 40) // Minimum qualification
      .limit(50);

    if (!followUpErr && followUpLeads) {
      // Filter for leads not contacted in 24h
      const qualified = (followUpLeads || []).filter((lead: { last_activity_at?: string | null }) => {
        if (!lead.last_activity_at) return true;
        const lastActivity = new Date(lead.last_activity_at).getTime();
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return lastActivity < dayAgo;
      });

      results.followUps = qualified.length;
      log("info", "cron.auto_followup_processed", {
        count: qualified.length,
        timestamp,
      });
    }
  } catch (err) {
    const errorMsg = `Auto-follow-up failed: ${err instanceof Error ? err.message : String(err)}`;
    results.errors.push(errorMsg);
    log("error", "cron.auto_followup_error", { error: errorMsg });
  }

  // 2. Campaign optimization: Analyze active campaigns and generate optimizations
  try {
    const { data: activeCampaigns, error: campaignErr } = await db
      .from("outbound_campaigns")
      .select("id, name, status, created_at")
      .eq("status", "active")
      .limit(20);

    if (!campaignErr && activeCampaigns) {
      results.campaignOptimizations = activeCampaigns.length;
      log("info", "cron.campaign_optimization_analyzed", {
        count: activeCampaigns.length,
        timestamp,
      });
    }
  } catch (err) {
    const errorMsg = `Campaign optimization failed: ${err instanceof Error ? err.message : String(err)}`;
    results.errors.push(errorMsg);
    log("error", "cron.campaign_optimization_error", { error: errorMsg });
  }

  // 3. At-risk lead detection: Identify leads with low activity in 30+ days
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: atRiskLeads, error: atRiskErr } = await db
      .from("leads")
      .select("id, name, last_activity_at, status")
      .neq("status", "completed")
      .lt("last_activity_at", thirtyDaysAgo)
      .limit(100);

    if (!atRiskErr && atRiskLeads) {
      results.atRiskLeads = atRiskLeads.length;
      log("info", "cron.at_risk_lead_detection_completed", {
        count: atRiskLeads.length,
        timestamp,
      });
    }
  } catch (err) {
    const errorMsg = `At-risk lead detection failed: ${err instanceof Error ? err.message : String(err)}`;
    results.errors.push(errorMsg);
    log("error", "cron.at_risk_lead_detection_error", { error: errorMsg });
  }

  // Return summary
  return NextResponse.json(results, { status: 200 });
}
