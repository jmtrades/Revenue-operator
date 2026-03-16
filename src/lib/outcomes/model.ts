/**
 * Pipeline Outcome Model — booking -> attendance -> closing probability.
 * Evaluates deal health and persists to deal_outcomes.
 */

import { getDb } from "@/lib/db/queries";
import { computeReadiness } from "@/lib/readiness/engine";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

export type DealOutcomeStage = "booked" | "attended" | "closed_won" | "closed_lost";

export interface DealOutcome {
  workspace_id: string;
  lead_id: string;
  stage: DealOutcomeStage;
  probability: number;
  risk_factors: string[];
  last_evaluated_at: string;
}

/** Compute attendance and close probability, persist to deal_outcomes. */
export async function evaluateDealOutcome(
  workspaceId: string,
  leadId: string
): Promise<DealOutcome | null> {
  const db = getDb();
  const now = new Date();

  const { data: lead } = await db
    .from("leads")
    .select("id, workspace_id, state, last_activity_at")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!lead) return null;

  const l = lead as { state: string; last_activity_at: string | null };
  let stage: DealOutcomeStage = "booked";
  if (l.state === "WON" || l.state === "CLOSED") stage = "closed_won";
  else if (l.state === "LOST") stage = "closed_lost";
  else if (l.state === "SHOWED" || l.state === "QUALIFIED" || l.state === "ENGAGED") stage = "attended";
  else if (l.state === "BOOKED") stage = "booked";
  else return null;

  const { data: dealRow } = await db
    .from("deals")
    .select("id, value_cents")
    .eq("lead_id", leadId)
    .neq("status", "lost")
    .limit(1)
    .maybeSingle();
  const dealId = (dealRow as { id?: string })?.id ?? null;

  const riskFactors: string[] = [];
  let attendanceProbability = 0.65;
  let closeProbability = 0.5;

  const readinessResult = await computeReadiness(workspaceId, leadId, dealId ?? undefined);
  const readinessNorm = readinessResult.conversation_readiness_score / 100;

  if (stage === "booked") {
    const { data: session } = await db
      .from("call_sessions")
      .select("call_started_at, show_status")
      .eq("lead_id", leadId)
      .gte("call_started_at", now.toISOString())
      .order("call_started_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const hoursToCall = session
      ? (new Date((session as { call_started_at: string }).call_started_at).getTime() - now.getTime()) / (1000 * 60 * 60)
      : 24;
    if (hoursToCall < 2) {
      attendanceProbability = 0.75;
    } else if (hoursToCall < 24) {
      attendanceProbability = 0.68;
    } else if (hoursToCall > 72) {
      attendanceProbability = 0.45;
      riskFactors.push("Call far out — engagement may decay");
    }

    const lastActivity = l.last_activity_at ? new Date(l.last_activity_at) : null;
    const hoursSinceActivity = lastActivity
      ? (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
      : 999;
    if (hoursSinceActivity > 24) {
      attendanceProbability *= 0.9;
      riskFactors.push("No recent contact");
    }
    if (hoursSinceActivity > 72) {
      attendanceProbability *= 0.8;
      riskFactors.push("Silent 3+ days");
    }

    const { count: pastNoShow } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId)
      .eq("show_status", "no_show");
    if ((pastNoShow ?? 0) > 0) {
      attendanceProbability *= 0.6;
      riskFactors.push("Past no-show");
    }

    attendanceProbability = Math.min(0.95, Math.max(0.1, attendanceProbability));
    attendanceProbability = attendanceProbability * 0.4 + readinessNorm * 0.6;
  }

  if (stage === "attended" && dealId) {
    try {
      const pred = await predictDealOutcome(dealId);
      closeProbability = pred.probability;
    } catch {
      closeProbability = 0.5;
    }
    if (readinessResult.risk_factors.length > 0) {
      riskFactors.push(...readinessResult.risk_factors);
    }
  }

  const probability = stage === "booked" ? attendanceProbability : stage === "attended" ? closeProbability : stage === "closed_won" ? 1 : 0;
  const lastEvaluatedAt = now.toISOString();

  await db
    .from("deal_outcomes")
    .upsert(
      {
        workspace_id: workspaceId,
        lead_id: leadId,
        stage,
        probability,
        risk_factors: riskFactors,
        last_evaluated_at: lastEvaluatedAt,
      },
      { onConflict: "workspace_id,lead_id" }
    );

  return {
    workspace_id: workspaceId,
    lead_id: leadId,
    stage,
    probability,
    risk_factors: riskFactors,
    last_evaluated_at: lastEvaluatedAt,
  };
}

/** Get current deal outcome for a lead. */
export async function getDealOutcome(
  workspaceId: string,
  leadId: string
): Promise<DealOutcome | null> {
  const db = getDb();
  const { data: row } = await db
    .from("deal_outcomes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!row) return null;
  const r = row as { stage: DealOutcomeStage; probability: number; risk_factors: unknown[]; last_evaluated_at: string };
  return {
    workspace_id: workspaceId,
    lead_id: leadId,
    stage: r.stage,
    probability: r.probability,
    risk_factors: Array.isArray(r.risk_factors) ? (r.risk_factors as string[]) : [],
    last_evaluated_at: r.last_evaluated_at,
  };
}
