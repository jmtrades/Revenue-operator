/**
 * Commitment Tracking
 * Track signals: confirmation reply, deposit paid, reminder acknowledgement, reschedule resistance.
 * Adjust no-show probability, reminder timing, follow-up tone.
 */

import { getDb } from "@/lib/db/queries";

export type CommitmentSignalType =
  | "confirmation_reply"
  | "deposit_paid"
  | "reminder_acknowledgement"
  | "reschedule_resistance";

const SIGNAL_WEIGHTS: Record<CommitmentSignalType, number> = {
  confirmation_reply: 0.25,
  deposit_paid: 0.5,
  reminder_acknowledgement: 0.2,
  reschedule_resistance: -0.3,
};

export async function recordCommitmentSignal(
  leadId: string,
  signalType: CommitmentSignalType,
  payload?: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  await db.from("commitment_signals").insert({
    lead_id: leadId,
    signal_type: signalType,
    payload: payload ?? {},
  });
  await updateCommitmentScore(leadId);
}

async function updateCommitmentScore(leadId: string): Promise<void> {
  const db = getDb();
  const { data: signals } = await db
    .from("commitment_signals")
    .select("signal_type")
    .eq("lead_id", leadId);

  const list = (signals ?? []) as { signal_type: string }[];
  let score = 0;
  for (const s of list) {
    score += SIGNAL_WEIGHTS[s.signal_type as CommitmentSignalType] ?? 0;
  }
  score = Math.max(0, Math.min(1, 0.5 + score));

  const { data: lead } = await db.from("leads").select("workspace_id").eq("id", leadId).maybeSingle();
  if (lead) {
    await db.from("leads").update({ commitment_score: score, updated_at: new Date().toISOString() }).eq("id", leadId);
  }
}

export async function getCommitmentScore(leadId: string): Promise<number> {
  const db = getDb();
  const { data } = await db.from("leads").select("commitment_score").eq("id", leadId).maybeSingle();
  return Number((data as { commitment_score?: number })?.commitment_score ?? 0.5);
}

export function getAdjustedNoShowProbability(baseProbability: number, commitmentScore: number): number {
  return Math.max(0, Math.min(1, baseProbability - commitmentScore * 0.3));
}

export function getAdjustedReminderHours(baseHours: number, commitmentScore: number): number {
  if (commitmentScore >= 0.7) return Math.max(2, baseHours * 0.5);
  if (commitmentScore <= 0.3) return baseHours * 1.5;
  return baseHours;
}
