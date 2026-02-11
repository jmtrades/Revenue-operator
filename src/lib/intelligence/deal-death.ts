/**
 * Deal Death Detection
 * Detects when opportunities are silently dying.
 * Behavioural patterns match lost deals → trigger intervention.
 */

import { getDb } from "@/lib/db/queries";

export interface DealDeathSignal {
  deal_id: string;
  lead_id: string;
  severity: "critical" | "warning" | "early";
  pattern_matched: string;
  message: string;
}

/** Check for death signals on a deal */
export async function detectDealDeath(
  workspaceId: string,
  dealId: string,
  leadId: string
): Promise<DealDeathSignal | null> {
  const db = getDb();

  const { data: lead } = await db
    .from("leads")
    .select("state, last_activity_at, created_at")
    .eq("id", leadId)
    .single();

  const { data: deal } = await db
    .from("deals")
    .select("created_at, status")
    .eq("id", dealId)
    .single();

  if (!lead || !deal) return null;

  const l = lead as { state: string; last_activity_at: string | null; created_at: string };
  const d = deal as { created_at: string; status: string };

  const now = new Date();
  const lastActivity = l.last_activity_at ? new Date(l.last_activity_at) : null;
  const daysSinceActivity = lastActivity
    ? (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const daysSinceCreated =
    (now.getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24);

  // Pattern: No reply 5+ days on qualified/booked deal
  if ((l.state === "QUALIFIED" || l.state === "BOOKED") && daysSinceActivity >= 5) {
    return {
      deal_id: dealId,
      lead_id: leadId,
      severity: daysSinceActivity >= 7 ? "critical" : "warning",
      pattern_matched: "no_reply_decay",
      message: `Opportunity slipping — no contact ${Math.floor(daysSinceActivity)} days. Intervention required.`,
    };
  }

  // Pattern: Deal aging without progression
  if (daysSinceCreated > 14 && (l.state === "CONTACTED" || l.state === "ENGAGED")) {
    return {
      deal_id: dealId,
      lead_id: leadId,
      severity: daysSinceCreated > 21 ? "critical" : "early",
      pattern_matched: "stalled_progression",
      message: "Deal stalling — no progression in 2+ weeks.",
    };
  }

  // Pattern: Recent engagement dropped to cold
  if (l.state === "REACTIVATE" && daysSinceActivity < 3) {
    return {
      deal_id: dealId,
      lead_id: leadId,
      severity: "early",
      pattern_matched: "recent_cooling",
      message: "Lead cooled recently — recovery window closing.",
    };
  }

  return null;
}

/** Persist signal and optionally schedule intervention */
export async function recordDealDeathSignal(
  workspaceId: string,
  signal: DealDeathSignal,
  scheduleIntervention: boolean = true
): Promise<void> {
  const db = getDb();

  const { data: existing } = await db
    .from("deal_death_signals")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("deal_id", signal.deal_id)
    .gte("triggered_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();

  if (existing) return; // Already flagged in last 24h

  await db.from("deal_death_signals").insert({
    workspace_id: workspaceId,
    deal_id: signal.deal_id,
    lead_id: signal.lead_id,
    severity: signal.severity,
    pattern_matched: signal.pattern_matched,
    intervention_scheduled: scheduleIntervention,
  });

  if (scheduleIntervention) {
    const { enqueue } = await import("@/lib/queue");
    await enqueue({
      type: "decision",
      leadId: signal.lead_id,
      workspaceId,
      eventId: `deal-death-${signal.deal_id}`,
    });
  }
}
