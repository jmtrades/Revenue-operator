/**
 * Autonomous Intelligence Loop — Cron Handler
 * Runs periodically to optimize leads, campaigns, and intelligence scoring
 * without human intervention. Triggers self-optimization actions.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { enqueue } from "@/lib/queue";
import { determineNextBestAction, type LeadState, type ActionContext } from "@/lib/intelligence/auto-follow-up-engine";
import { analyzeCampaignPerformance, generateOptimizations, type CampaignSnapshot } from "@/lib/intelligence/campaign-optimizer";
import { decideSmartReactivation, executeSmartReactivation } from "@/lib/intelligence/smart-reactivation";

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
    const workspaceId = req.nextUrl.searchParams.get("workspace_id") || "";

    // Fetch leads needing follow-up (not recently contacted, with qualification potential)
    const { data: followUpLeads, error: followUpErr } = await db
      .from("leads")
      .select(
        "id, name, email, phone, company, qualification_score, last_activity_at, engagement_score, total_touches, " +
        "touches_this_week, callback_requested, callback_requested_time, pricing_interest_signals, showed_for_demo, " +
        "demo_date, last_demo_outcome, objection_type, is_from_competitor, industry, current_stage, response_rate, " +
        "opened_emails, clicked_links, metadata"
      )
      .eq("workspace_id", workspaceId)
      .gte("qualification_score", 40) // Minimum qualification
      .limit(50);

    if (!followUpErr && followUpLeads) {
      // Filter for leads not contacted in 24h
      type FollowUpLead = Record<string, unknown> & { id: string; last_activity_at?: string | null };
      const qualified = ((followUpLeads || []) as unknown as FollowUpLead[]).filter((lead) => {
        if (!lead.last_activity_at) return true;
        const lastActivity = new Date(lead.last_activity_at).getTime();
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return lastActivity < dayAgo;
      });

      results.followUps = qualified.length;

      // Execute: Determine next best action for each lead and enqueue actionable items
      const actionContext: ActionContext = {
        workspace_id: workspaceId,
        current_time: timestamp,
        timezone: "UTC",
        working_hours_start: 9,
        working_hours_end: 17,
        working_days: [1, 2, 3, 4, 5],
        autonomy_level: "auto",
        max_touches_per_week: 3,
        cool_down_hours_after_high_engagement: 2,
      };

      for (const lead of qualified) {
        try {
          const l = lead as Record<string, unknown>;
          const leadState: LeadState = {
            lead_id: String(l.id ?? ""),
            name: String(l.name ?? ""),
            company: String(l.company ?? ""),
            email: String(l.email ?? ""),
            phone: String(l.phone ?? ""),
            current_stage: (String(l.current_stage ?? "contacted")) as LeadState["current_stage"],
            last_interaction: (l.last_activity_at as string) ?? null,
            engagement_score: Number(l.engagement_score ?? 0),
            lead_score: Number(l.qualification_score ?? 0),
            total_touches: Number(l.total_touches ?? 0),
            touches_this_week: Number(l.touches_this_week ?? 0),
            days_since_last_contact: l.last_activity_at
              ? Math.floor((Date.now() - new Date(String(l.last_activity_at)).getTime()) / (1000 * 60 * 60 * 24))
              : 999,
            response_rate: Number(l.response_rate ?? 0),
            opened_emails: Number(l.opened_emails ?? 0),
            clicked_links: Number(l.clicked_links ?? 0),
            callback_requested: Boolean(l.callback_requested),
            callback_requested_time: (l.callback_requested_time as string) ?? null,
            pricing_interest_signals: Number(l.pricing_interest_signals ?? 0),
            showed_for_demo: Boolean(l.showed_for_demo),
            demo_date: (l.demo_date as string) ?? null,
            last_demo_outcome: (l.last_demo_outcome as LeadState["last_demo_outcome"]) ?? null,
            objection_type: (l.objection_type as LeadState["objection_type"]) ?? null,
            is_from_competitor: Boolean(l.is_from_competitor),
            industry: (l.industry as string) ?? null,
            metadata: (l.metadata ?? {}) as Record<string, unknown>,
          };

          const action = determineNextBestAction(leadState, actionContext);

          // Enqueue actionable items (call or sms) as reactivation jobs
          if (action.action === "call" || action.action === "sms") {
            await enqueue({
              type: "reactivation",
              leadId: String(l.id),
            });

            log("info", "cron.action_enqueued", {
              leadId: String(l.id),
              action: action.action,
              reason: action.reason,
              priority: action.priority,
            });
          }
        } catch (err) {
          const errorMsg = `Failed to determine action for lead ${lead.id}: ${err instanceof Error ? err.message : String(err)}`;
          log("warn", "cron.action_determination_error", { leadId: lead.id, error: errorMsg });
        }
      }

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
      .select(
        "id, name, status, created_at, metrics, channels, lead_filters, call_windows, budget"
      )
      .eq("status", "active")
      .limit(20);

    if (!campaignErr && activeCampaigns) {
      results.campaignOptimizations = activeCampaigns.length;

      // Execute: Analyze each campaign and log recommendations
      for (const rawCampaign of activeCampaigns) {
        const campaign = rawCampaign as Record<string, unknown>;
        try {
          const campaignSnapshot: CampaignSnapshot = {
            campaignId: String(campaign.id),
            name: String(campaign.name ?? ""),
            status: String(campaign.status ?? "active") as CampaignSnapshot["status"],
            startDate: new Date(String(campaign.created_at)),
            currentDate: new Date(),
            metrics: (campaign.metrics as CampaignSnapshot["metrics"]) || {
              totalAttempts: 0,
              contactRate: 0,
              connectionRate: 0,
              qualificationRate: 0,
              conversionRate: 0,
              totalLeadsContacted: 0,
              totalConnections: 0,
              totalQualified: 0,
              totalConversions: 0,
              costPerLead: 0,
              costPerConnection: 0,
              costPerQualification: 0,
              costPerAcquisition: 0,
              totalSpent: 0,
              totalRevenue: 0,
              daysActive: 0,
            },
            channels: (campaign.channels as CampaignSnapshot["channels"]) || [],
            leadFilters: (campaign.lead_filters as CampaignSnapshot["leadFilters"]) || { minScore: 50, maxScore: 100, industries: [], companies: [], jobTitles: [] },
            callWindows: (campaign.call_windows as CampaignSnapshot["callWindows"]) || [],
            budget: (campaign.budget as CampaignSnapshot["budget"]) || { total: 0, spent: 0, remaining: 0, byChannel: {} },
          };

          const analysis = analyzeCampaignPerformance(campaignSnapshot);
          const optimizations = generateOptimizations(analysis);

          if (optimizations.length > 0) {
            log("info", "cron.campaign_optimizations_generated", {
              campaignId: String(campaign.id),
              campaignName: String(campaign.name),
              optimizationCount: optimizations.length,
              health: analysis.health,
              riskFactors: analysis.riskFactors,
              recommendations: optimizations.map((o) => ({
                type: o.type,
                priority: o.priority,
                action: o.implementation.action,
              })),
            });
          }
        } catch (err) {
          const errorMsg = `Failed to analyze campaign ${String(campaign.id)}: ${err instanceof Error ? err.message : String(err)}`;
          log("warn", "cron.campaign_analysis_error", { campaignId: String(campaign.id), error: errorMsg });
        }
      }

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
    const _workspaceId = req.nextUrl.searchParams.get("workspace_id") || "";
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: atRiskLeads, error: atRiskErr } = await db
      .from("leads")
      .select("id, name, last_activity_at, status, workspace_id")
      .neq("status", "completed")
      .lt("last_activity_at", thirtyDaysAgo)
      .limit(100);

    if (!atRiskErr && atRiskLeads) {
      results.atRiskLeads = atRiskLeads.length;

      // Execute: For each at-risk lead, compute reactivation decision and execute if needed
      let reactivatedCount = 0;
      for (const rawLead of atRiskLeads) {
        const lead = rawLead as Record<string, unknown>;
        try {
          const decision = await decideSmartReactivation(String(lead.workspace_id), String(lead.id));

          if (decision.should_reactivate) {
            const result = await executeSmartReactivation(String(lead.workspace_id), String(lead.id), decision);

            if (result.success) {
              reactivatedCount++;
              log("info", "cron.at_risk_lead_reactivated", {
                leadId: String(lead.id),
                leadName: String(lead.name),
                trigger: decision.trigger,
                angle: decision.angle,
                channel: decision.channel,
                reason: decision.reason,
                confidence: decision.confidence,
              });
            } else {
              log("warn", "cron.at_risk_reactivation_failed", {
                leadId: String(lead.id),
                details: result.details,
              });
            }
          } else {
            log("info", "cron.at_risk_lead_skipped", {
              leadId: String(lead.id),
              reason: decision.reason,
            });
          }
        } catch (err) {
          const errorMsg = `Failed to process at-risk lead ${String(lead.id)}: ${err instanceof Error ? err.message : String(err)}`;
          log("warn", "cron.at_risk_decision_error", { leadId: String(lead.id), error: errorMsg });
        }
      }

      log("info", "cron.at_risk_lead_detection_completed", {
        count: atRiskLeads.length,
        reactivated: reactivatedCount,
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
