/**
 * Deal Outcome Prediction
 * Compute probability of close using historical outcomes and signals.
 */

import { getDb } from "@/lib/db/queries";
import { isColdStart, COLD_START_PREDICTION_WEIGHT } from "@/lib/cold-start";

export interface DealPrediction {
  deal_id: string;
  probability: number;
  signals: string[];
  updated_at: string;
}

export async function predictDealOutcome(dealId: string): Promise<DealPrediction> {
  const db = getDb();
  const { data: deal } = await db
    .from("deals")
    .select("id, lead_id, workspace_id, status, created_at")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { deal_id: dealId, probability: 0, signals: [], updated_at: new Date().toISOString() };

  const d = deal as { lead_id: string; workspace_id: string; status: string };
  let score = 0.5;
  const signals: string[] = [];

  const { data: lead } = await db
    .from("leads")
    .select("state, last_activity_at, created_at")
    .eq("id", d.lead_id)
    .maybeSingle();
  if (lead) {
    const l = lead as { state: string; last_activity_at: string; created_at: string };
    if (l.state === "QUALIFIED" || l.state === "BOOKED") {
      score += 0.2;
      signals.push("qualified_fast");
    }
    if (l.state === "SHOWED" || l.state === "WON") {
      score += 0.3;
      signals.push("showed");
    }
  }

  const { data: convs } = await db.from("conversations").select("id").eq("lead_id", d.lead_id);
  const convIds = (convs ?? []).map((c: { id: string }) => c.id);
  const { count: msgCount } = convIds.length
    ? await db.from("messages").select("id", { count: "exact", head: true }).in("conversation_id", convIds)
    : { count: 0 };
  if ((msgCount ?? 0) > 5) {
    score += 0.05;
    signals.push("high_engagement");
  }

  const { count: wonCount } = await db
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", d.workspace_id)
    .eq("status", "won");
  if ((wonCount ?? 0) > 0) {
    score += 0.05;
    signals.push("similar_won");
  }

  const coldStart = await isColdStart(d.workspace_id);
  const probability = coldStart
    ? COLD_START_PREDICTION_WEIGHT
    : Math.min(0.95, Math.max(0.05, score));
  return {
    deal_id: dealId,
    probability,
    signals,
    updated_at: new Date().toISOString(),
  };
}
