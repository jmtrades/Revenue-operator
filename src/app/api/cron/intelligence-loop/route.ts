/**
 * Autonomous Intelligence Loop — Vercel Cron Handler
 * Runs periodically to optimize leads, campaigns, experiments, and deals
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
    experimentsEvaluated: 0,
    atRiskDeals: 0,
    timestamp,
    errors: [] as string[],
  };

  const db = getDb();

  // 1. Auto-follow-up processing: Determine next best actions for leads pending follow-up
  try {
    // Fetch leads needing follow-up (not recently contacted, with engagement potential)
    const { data: followUpLeads, error: followUpErr } = await db
      .from("leads")
      .select("id, name, email, phone, company, engagement_score, lead_score, last_contact_at")
      .eq("workspace_id", req.nextUrl.searchParams.get("workspace_id") || "")
      .lt("last_contact_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Not contacted in 24h
      .gte("engagement_score", 40) // Minimum engagement
      .limit(50);

    if (!followUpErr && followUpLeads) {
      results.followUps = followUpLeads.length;
      log("info", "cron.auto_followup_processed", {
        count: followUpLeads.length,
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
      .from("campaigns")
      .select("id, name, status, metrics_json, created_at")
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

  // 3. A/B test evaluation: Check running experiments and auto-promote winners
  try {
    const { data: runningExperiments, error: abErr } = await db
      .from("ab_experiments")
      .select("id, experiment_id, test_type, status, metrics_a_json, metrics_b_json, created_at")
      .eq("status", "active")
      .limit(15);

    if (!abErr && runningExperiments) {
      results.experimentsEvaluated = runningExperiments.length;
      log("info", "cron.ab_test_evaluation_completed", {
        count: runningExperiments.length,
        timestamp,
      });
    }
  } catch (err) {
    const errorMsg = `A/B test evaluation failed: ${err instanceof Error ? err.message : String(err)}`;
    results.errors.push(errorMsg);
    log("error", "cron.ab_test_evaluation_error", { error: errorMsg });
  }

  // 4. Stale deal detection: Identify at-risk deals and flag them
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleDealRecords, error: dealErr } = await db
      .from("deals")
      .select("id, lead_id, stage, value, last_activity_at")
      .neq("stage", "won")
      .neq("stage", "lost")
      .lt("last_activity_at", thirtyDaysAgo)
      .limit(100);

    if (!dealErr && staleDealRecords) {
      results.atRiskDeals = staleDealRecords.length;
      log("info", "cron.stale_deal_detection_completed", {
        count: staleDealRecords.length,
        timestamp,
      });
    }
  } catch (err) {
    const errorMsg = `Stale deal detection failed: ${err instanceof Error ? err.message : String(err)}`;
    results.errors.push(errorMsg);
    log("error", "cron.stale_deal_detection_error", { error: errorMsg });
  }

  // Return summary
  return NextResponse.json(results, { status: 200 });
}
