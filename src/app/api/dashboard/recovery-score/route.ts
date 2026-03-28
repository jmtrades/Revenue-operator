/**
 * GET /api/dashboard/recovery-score?workspace_id=...
 * Returns the proprietary "Revenue Recovery Score™" — a 0-100 compound metric
 * that measures how well a workspace is recovering lost revenue opportunities.
 *
 * The score is calculated from 5 sub-signals:
 *   1. Speed-to-Lead (0-20): How fast follow-ups happen after missed calls
 *   2. Follow-up Execution (0-20): % of leads that get follow-ups
 *   3. No-Show Recovery (0-20): % of no-shows that are rebooked
 *   4. Stale Lead Reactivation (0-20): % of stale leads that are re-engaged
 *   5. Conversion Depth (0-20): Appointments booked / calls answered ratio
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

interface RecoveryScoreResponse {
  score: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  sub_scores: {
    speed_to_lead: number;
    follow_up_execution: number;
    no_show_recovery: number;
    stale_reactivation: number;
    conversion_depth: number;
  };
  estimated_monthly_recovery_cents: number;
  estimated_monthly_leakage_cents: number;
  confidence: "high" | "medium" | "low";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  let confidence: "high" | "medium" | "low" = "low";

  // Initialize sub-scores with midpoint (10 = no signal)
  let speedToLead = 10;
  let followUpExecution = 10;
  let noShowRecovery = 10;
  let staleReactivation = 10;
  let conversionDepth = 10;

  // Track data availability for confidence scoring
  let hasSpeedData = false;
  let hasFollowUpData = false;
  let hasNoShowData = false;
  let hasStaleData = false;
  let hasConversionData = false;

  try {
    // ─────────────────────────────────────────────────────────────────────
    // 1. SPEED-TO-LEAD (0-20): Time from missed call to first follow-up
    // ─────────────────────────────────────────────────────────────────────
    try {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get missed calls from last 7 days
      const { data: missedCalls } = await db
        .from("call_sessions")
        .select("id, call_started_at")
        .eq("workspace_id", workspaceId)
        .eq("direction", "inbound")
        .in("status", ["missed", "no_answer", "abandoned"])
        .gte("call_started_at", sevenDaysAgo.toISOString());

      if (missedCalls && missedCalls.length > 0) {
        hasSpeedData = true;

        // For each missed call, check if there's a follow-up (SMS or call) within time window
        const callIds = (missedCalls as Array<{ id: string; call_started_at: string }>).map(
          (c) => c.id
        );

        const { data: followUps } = await db
          .from("followup_sequences")
          .select("id, call_session_id, created_at")
          .eq("workspace_id", workspaceId)
          .in("call_session_id", callIds);

        if (followUps && followUps.length > 0) {
          const followUpMap = new Map(
            (followUps as Array<{ call_session_id: string; created_at: string }>).map((fu) => [
              fu.call_session_id,
              fu.created_at,
            ])
          );

          const timeDiffs: number[] = [];
          (missedCalls as Array<{ id: string; call_started_at: string }>).forEach((call) => {
            const followUpTime = followUpMap.get(call.id);
            if (followUpTime) {
              const diffMs = new Date(followUpTime).getTime() - new Date(call.call_started_at).getTime();
              timeDiffs.push(diffMs / 60000); // Convert to minutes
            }
          });

          if (timeDiffs.length > 0) {
            const avgMinutes = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
            // <5min = 20, <15min = 15, <60min = 10, else 5
            if (avgMinutes < 5) speedToLead = 20;
            else if (avgMinutes < 15) speedToLead = 15;
            else if (avgMinutes < 60) speedToLead = 10;
            else speedToLead = 5;
          }
        }
      }
    } catch {
      // Table may not exist yet
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. FOLLOW-UP EXECUTION (0-20): % of leads needing follow-up that got one
    // ─────────────────────────────────────────────────────────────────────
    try {
      // Get all qualified leads that don't have a follow-up sent
      const { count: leadsNeedingFollowUp } = await db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .not("state", "in", '("ARCHIVED","LOST","DISQUALIFIED","WON")');

      const { count: followUpsSent } = await db
        .from("followup_sequences")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if ((leadsNeedingFollowUp ?? 0) > 0) {
        hasFollowUpData = true;
        const rate = ((followUpsSent ?? 0) / (leadsNeedingFollowUp ?? 1)) * 100;
        // 100% = 20, >80% = 16, >50% = 12, else 6
        if (rate >= 100) followUpExecution = 20;
        else if (rate > 80) followUpExecution = 16;
        else if (rate > 50) followUpExecution = 12;
        else followUpExecution = 6;
      }
    } catch {
      // Table may not exist yet
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. NO-SHOW RECOVERY (0-20): % of no-shows that are rebooked
    // ─────────────────────────────────────────────────────────────────────
    try {
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // Get total no-shows in last 14 days
      const { count: totalNoShows } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "no_show")
        .gte("start_time", fourteenDaysAgo.toISOString());

      // Get rebooked appointments (follow-up with new appointment scheduled)
      const { data: noShowAppointments } = await db
        .from("appointments")
        .select("id, lead_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "no_show")
        .gte("start_time", fourteenDaysAgo.toISOString());

      if ((totalNoShows ?? 0) > 0 && noShowAppointments && noShowAppointments.length > 0) {
        hasNoShowData = true;

        const noShowLeadIds = (noShowAppointments as Array<{ id: string; lead_id: string }>).map(
          (a) => a.lead_id
        );

        const { count: rebooked } = await db
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .in("lead_id", noShowLeadIds)
          .eq("status", "scheduled")
          .gt("start_time", fourteenDaysAgo.toISOString());

        const recoveryRate = ((rebooked ?? 0) / (totalNoShows ?? 1)) * 100;
        // Score proportionally: >50% = 20, >30% = 15, >10% = 10, else 5
        if (recoveryRate > 50) noShowRecovery = 20;
        else if (recoveryRate > 30) noShowRecovery = 15;
        else if (recoveryRate > 10) noShowRecovery = 10;
        else noShowRecovery = 5;
      }
    } catch {
      // Table may not exist yet
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. STALE LEAD REACTIVATION (0-20): % of 7+ day inactive leads re-engaged
    // ─────────────────────────────────────────────────────────────────────
    try {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get stale leads (no activity in 7+ days)
      const { data: staleLeads } = await db
        .from("leads")
        .select("id, updated_at")
        .eq("workspace_id", workspaceId)
        .not("state", "in", '("ARCHIVED","LOST","DISQUALIFIED","WON")')
        .lt("updated_at", sevenDaysAgo.toISOString());

      if (staleLeads && staleLeads.length > 0) {
        hasStaleData = true;

        const staleLeadIds = (staleLeads as Array<{ id: string; updated_at: string }>).map(
          (l) => l.id
        );

        // Check if any of these leads were contacted after being marked stale
        const { count: reactivated } = await db
          .from("followup_sequences")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .in("lead_id", staleLeadIds)
          .gte("created_at", sevenDaysAgo.toISOString());

        const reactivationRate = ((reactivated ?? 0) / (staleLeads.length)) * 100;
        // Score proportionally: >40% = 20, >25% = 15, >10% = 10, else 5
        if (reactivationRate > 40) staleReactivation = 20;
        else if (reactivationRate > 25) staleReactivation = 15;
        else if (reactivationRate > 10) staleReactivation = 10;
        else staleReactivation = 5;
      }
    } catch {
      // Table may not exist yet
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. CONVERSION DEPTH (0-20): Appointments booked / calls answered ratio
    // ─────────────────────────────────────────────────────────────────────
    try {
      const { count: callsAnswered } = await db
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", ["completed", "transferred", "recorded"]);

      const { count: appointmentsBooked } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "scheduled");

      if ((callsAnswered ?? 0) > 0) {
        hasConversionData = true;
        const conversionRate = ((appointmentsBooked ?? 0) / (callsAnswered ?? 1)) * 100;
        // >15% = 20, >10% = 16, >5% = 12, else 6
        if (conversionRate > 15) conversionDepth = 20;
        else if (conversionRate > 10) conversionDepth = 16;
        else if (conversionRate > 5) conversionDepth = 12;
        else conversionDepth = 6;
      }
    } catch {
      // Table may not exist yet
    }

    // ─────────────────────────────────────────────────────────────────────
    // Determine confidence level
    // ─────────────────────────────────────────────────────────────────────
    const dataSignals = [hasSpeedData, hasFollowUpData, hasNoShowData, hasStaleData, hasConversionData];
    const dataCount = dataSignals.filter(Boolean).length;

    if (dataCount >= 4) confidence = "high";
    else if (dataCount >= 2) confidence = "medium";
    else confidence = "low";

    // ─────────────────────────────────────────────────────────────────────
    // Calculate final score and grade
    // ─────────────────────────────────────────────────────────────────────
    const score = speedToLead + followUpExecution + noShowRecovery + staleReactivation + conversionDepth;

    let grade: "A+" | "A" | "B" | "C" | "D";
    if (score >= 95) grade = "A+";
    else if (score >= 85) grade = "A";
    else if (score >= 70) grade = "B";
    else if (score >= 55) grade = "C";
    else grade = "D";

    // ─────────────────────────────────────────────────────────────────────
    // Calculate estimated financial impact
    // ─────────────────────────────────────────────────────────────────────

    // Get average deal value
    let avgDealValue = 250; // Default: $250
    try {
      const { data: ctx } = await db
        .from("workspace_business_context")
        .select("pricing_range")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      const ctxRow = ctx as { pricing_range?: string | null } | null;
      if (ctxRow?.pricing_range) {
        const nums = ctxRow.pricing_range.match(/\d+/g);
        if (nums && nums.length >= 2) {
          avgDealValue = Math.round((parseInt(nums[0]) + parseInt(nums[1])) / 2);
        } else if (nums && nums.length === 1) {
          avgDealValue = parseInt(nums[0]);
        }
      }
    } catch {
      // Use default
    }

    // Monthly recovery: (appointments_booked * average_deal_value)
    const { count: monthlyAppointments } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "scheduled")
      .gte("start_time", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const estimatedMonthlyRecoveryCents = ((monthlyAppointments ?? 0) * avgDealValue * 100);

    // Monthly leakage: (missed_calls + stale_leads + no_shows) * deal_value * 15%
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: missedCalls } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("direction", "inbound")
      .in("status", ["missed", "no_answer", "abandoned"])
      .gte("call_started_at", sevenDaysAgo.toISOString());

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { count: unresolvedNoShows } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "no_show")
      .gte("start_time", fourteenDaysAgo.toISOString());

    const staleLeadIds2: string[] = [];
    try {
      const { data: staleLeads } = await db
        .from("leads")
        .select("id")
        .eq("workspace_id", workspaceId)
        .not("state", "in", '("ARCHIVED","LOST","DISQUALIFIED","WON")')
        .lt("updated_at", sevenDaysAgo.toISOString());
      if (staleLeads) {
        staleLeadIds2.push(...(staleLeads as Array<{ id: string }>).map((l) => l.id));
      }
    } catch {
      // No stale leads
    }

    const totalLeakageEvents = (missedCalls ?? 0) + (unresolvedNoShows ?? 0) + staleLeadIds2.length;
    const estimatedMonthlyLeakageCents = Math.round(
      totalLeakageEvents * avgDealValue * 100 * 0.15 // 15% conversion potential
    );

    const response: RecoveryScoreResponse = {
      score,
      grade,
      sub_scores: {
        speed_to_lead: speedToLead,
        follow_up_execution: followUpExecution,
        no_show_recovery: noShowRecovery,
        stale_reactivation: staleReactivation,
        conversion_depth: conversionDepth,
      },
      estimated_monthly_recovery_cents: estimatedMonthlyRecoveryCents,
      estimated_monthly_leakage_cents: estimatedMonthlyLeakageCents,
      confidence,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
