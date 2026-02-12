/**
 * Perception Engine — Unified deal_state_vector for every active lead.
 * AI assists classification only. No business actions.
 * All downstream subsystems consume this single source of truth.
 */

import { getDb } from "@/lib/db/queries";
import { computeReadiness } from "@/lib/readiness/engine";
import { getWarmthScores } from "@/lib/momentum/warmth";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

export interface DealStateVector {
  lead_id: string;
  workspace_id: string;
  state: string;
  opt_out: boolean;
  is_vip: boolean;
  company: string | null;
  readiness: number; // 0–100
  warmth: number; // 0–100
  engagement_decay_hours: number;
  deal_probability: number; // 0–1
  attendance_probability: number; // 0–1 (for BOOKED)
  silence_risk: number; // 0–1 (no_reply window closing)
  recovery_probability: number; // 0–1 (for REACTIVATE/decayed)
  deal_id: string | null;
  next_session_at: string | null;
  last_activity_at: string | null;
  no_reply_scheduled_at: string | null;
  signal_breakdown: Record<string, number>;
  risk_factors: string[];
  computed_at: string;
}

/** Compute unified deal_state_vector for a lead. Single source of truth. */
export async function computeDealStateVector(
  workspaceId: string,
  leadId: string
): Promise<DealStateVector | null> {
  const db = getDb();
  const now = new Date();

  const { data: lead } = await db
    .from("leads")
    .select("id, workspace_id, state, last_activity_at, opt_out, is_vip, company")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!lead) return null;
  const l = lead as { id: string; workspace_id: string; state: string; last_activity_at?: string | null; opt_out?: boolean; is_vip?: boolean; company?: string | null };

  if (l.opt_out) {
    return {
      lead_id: leadId,
      workspace_id: workspaceId,
      state: l.state,
      opt_out: true,
      is_vip: l.is_vip ?? false,
      company: l.company ?? null,
      readiness: 0,
      warmth: 0,
      engagement_decay_hours: 999,
      deal_probability: 0,
      attendance_probability: 0,
      silence_risk: 0,
      recovery_probability: 0,
      deal_id: null,
      next_session_at: null,
      last_activity_at: l.last_activity_at ?? null,
      no_reply_scheduled_at: null,
      signal_breakdown: { opt_out: 0 },
      risk_factors: ["Opted out"],
      computed_at: now.toISOString(),
    };
  }

  const { data: dealRow } = await db
    .from("deals")
    .select("id")
    .eq("lead_id", leadId)
    .neq("status", "lost")
    .limit(1)
    .single();
  const dealId = (dealRow as { id?: string })?.id ?? null;

  const readinessResult = await computeReadiness(workspaceId, leadId, dealId ?? undefined);
  const warmthMap = await getWarmthScores(workspaceId, [leadId]);
  const warmth = warmthMap[leadId] ?? 0;

  const lastActivity = l.last_activity_at ? new Date(l.last_activity_at) : null;
  const engagementDecayHours = lastActivity
    ? (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    : 999;

  let dealProbability = 0;
  if (dealId) {
    try {
      const pred = await predictDealOutcome(dealId);
      dealProbability = pred.probability;
    } catch {
      // skip
    }
  }

  let attendanceProbability = 0;
  let nextSessionAt: string | null = null;
  if (l.state === "BOOKED") {
    const { data: upcomingSession } = await db
      .from("call_sessions")
      .select("call_started_at")
      .eq("lead_id", leadId)
      .gte("call_started_at", now.toISOString())
      .order("call_started_at", { ascending: true })
      .limit(1)
      .single();
    if (upcomingSession) {
      nextSessionAt = (upcomingSession as { call_started_at?: string })?.call_started_at ?? null;
    }
    try {
      const { getDealOutcome } = await import("@/lib/outcomes/model");
      const outcome = await getDealOutcome(workspaceId, leadId);
      attendanceProbability = outcome?.stage === "booked" ? outcome.probability : 0.65;
    } catch {
      attendanceProbability = 0.65;
    }
  }

  let silenceRisk = 0;
  let noReplyScheduledAt: string | null = null;
  const { data: autoState } = await db
    .from("automation_states")
    .select("no_reply_scheduled_at, last_event_at")
    .eq("lead_id", leadId)
    .single();
  if (autoState) {
    const a = autoState as { no_reply_scheduled_at?: string | null; last_event_at?: string | null };
    noReplyScheduledAt = a.no_reply_scheduled_at ?? null;
    if (a.no_reply_scheduled_at) {
      const nrTime = new Date(a.no_reply_scheduled_at).getTime();
      const hrsUntil = (nrTime - now.getTime()) / (1000 * 60 * 60);
      if (hrsUntil <= 0) silenceRisk = 1;
      else if (hrsUntil < 6) silenceRisk = 0.8;
      else if (hrsUntil < 24) silenceRisk = 0.5;
    }
  }

  let recoveryProbability = 0;
  if (l.state === "REACTIVATE" || engagementDecayHours > 72) {
    const stateBoost = readinessResult.signal_breakdown["state"] ?? 0;
    const warmthContribution = Math.min(30, warmth);
    recoveryProbability = Math.min(0.9, 0.2 + (stateBoost / 100) + (warmthContribution / 150));
  }

  const signalBreakdown: Record<string, number> = {
    ...readinessResult.signal_breakdown,
    warmth,
    engagement_decay_hours: engagementDecayHours,
    deal_probability: dealProbability,
    attendance_probability: attendanceProbability,
    silence_risk: silenceRisk,
    recovery_probability: recoveryProbability,
  };

  return {
    lead_id: leadId,
    workspace_id: workspaceId,
    state: l.state,
    opt_out: false,
    is_vip: l.is_vip ?? false,
    company: l.company ?? null,
    readiness: readinessResult.conversation_readiness_score,
    warmth,
    engagement_decay_hours: Math.round(engagementDecayHours * 10) / 10,
    deal_probability: dealProbability,
    attendance_probability: attendanceProbability,
    silence_risk: silenceRisk,
    recovery_probability: recoveryProbability,
    deal_id: dealId,
    next_session_at: nextSessionAt,
    last_activity_at: l.last_activity_at ?? null,
    no_reply_scheduled_at: noReplyScheduledAt,
    signal_breakdown: signalBreakdown,
    risk_factors: readinessResult.risk_factors,
    computed_at: now.toISOString(),
  };
}
