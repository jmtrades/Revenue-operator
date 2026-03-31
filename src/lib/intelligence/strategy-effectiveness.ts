/**
 * Strategy effectiveness memory. Bounded window scoring. No randomness. No COUNT(*).
 */

import { getDb } from "@/lib/db/queries";
import { appendLedgerEvent } from "@/lib/ops/ledger";
import { log } from "@/lib/logger";

const WINDOW_LIMIT = 200;
const ESCALATION_PENALTY = 20;
const SUPPRESS_THRESHOLD = -10;

export interface RecordStrategyEffectivenessInput {
  workspaceId: string;
  threadId?: string | null;
  variantKey: string;
  objective?: string | null;
  outcomeType: string;
  commitmentDelta?: number;
  goodwillDelta?: number;
  escalationTriggered?: boolean;
}

export interface VariantScore {
  variantKey: string;
  score: number;
  avgCommitmentDelta: number;
  avgGoodwillDelta: number;
  escalationRate: number;
}

/**
 * Record one effectiveness row. Append-only.
 */
export async function recordStrategyEffectiveness(
  input: RecordStrategyEffectivenessInput
): Promise<{ ok: boolean }> {
  const db = getDb();
  try {
    await db.from("strategy_effectiveness_registry").insert({
      workspace_id: input.workspaceId,
      thread_id: (input.threadId ?? null)?.slice(0, 512) ?? null,
      variant_key: input.variantKey.slice(0, 64),
      objective: input.objective?.slice(0, 128) ?? null,
      outcome_type: input.outcomeType.slice(0, 64),
      commitment_delta: Number(input.commitmentDelta) || 0,
      goodwill_delta: Number(input.goodwillDelta) || 0,
      escalation_triggered: Boolean(input.escalationTriggered),
    });
    await appendLedgerEvent({
      workspaceId: input.workspaceId,
      eventType: "strategy_effectiveness_recorded",
      severity: "info",
      subjectType: "workspace",
      subjectRef: input.workspaceId,
      details: { variant_key: input.variantKey, outcome_type: input.outcomeType },
    }).catch((err: unknown) => { log("warn", "strategy_effectiveness.ledger_append_failed", { error: err instanceof Error ? err.message : String(err) }); });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Evaluate effectiveness score for a variant. Window: last 200 rows. No COUNT(*); use array length.
 * Score = avgCommitmentDelta + avgGoodwillDelta - (escalationRate * 20).
 */
export async function evaluateVariantEffectiveness(
  workspaceId: string,
  variantKey: string
): Promise<number> {
  const db = getDb();
  const { data: rows } = await db
    .from("strategy_effectiveness_registry")
    .select("commitment_delta, goodwill_delta, escalation_triggered")
    .eq("workspace_id", workspaceId)
    .eq("variant_key", variantKey.slice(0, 64))
    .order("recorded_at", { ascending: false })
    .limit(WINDOW_LIMIT);
  const list = (rows ?? []) as Array<{ commitment_delta: number; goodwill_delta: number; escalation_triggered: boolean }>;
  const n = list.length;
  if (n === 0) return 0;
  let sumCommitment = 0;
  let sumGoodwill = 0;
  let escalationCount = 0;
  for (const r of list) {
    sumCommitment += Number(r.commitment_delta) || 0;
    sumGoodwill += Number(r.goodwill_delta) || 0;
    if (r.escalation_triggered) escalationCount += 1;
  }
  const avgCommitmentDelta = sumCommitment / n;
  const avgGoodwillDelta = sumGoodwill / n;
  const escalationRate = escalationCount / n;
  const score = avgCommitmentDelta + avgGoodwillDelta - escalationRate * ESCALATION_PENALTY;
  return Math.round(score * 10) / 10;
}

/**
 * Get workspace strategy matrix: scores for all variants that appear in window.
 */
export async function getWorkspaceStrategyMatrix(
  workspaceId: string
): Promise<Record<string, number>> {
  const db = getDb();
  const { data: rows } = await db
    .from("strategy_effectiveness_registry")
    .select("variant_key, commitment_delta, goodwill_delta, escalation_triggered")
    .eq("workspace_id", workspaceId)
    .order("recorded_at", { ascending: false })
    .limit(WINDOW_LIMIT);
  const list = (rows ?? []) as Array<{ variant_key: string; commitment_delta: number; goodwill_delta: number; escalation_triggered: boolean }>;
  const byVariant = new Map<string, { sumC: number; sumG: number; esc: number; n: number }>();
  for (const r of list) {
    const k = r.variant_key ?? "direct";
    const cur = byVariant.get(k) ?? { sumC: 0, sumG: 0, esc: 0, n: 0 };
    cur.sumC += Number(r.commitment_delta) || 0;
    cur.sumG += Number(r.goodwill_delta) || 0;
    if (r.escalation_triggered) cur.esc += 1;
    cur.n += 1;
    byVariant.set(k, cur);
  }
  const out: Record<string, number> = {};
  for (const [variantKey, agg] of byVariant) {
    if (agg.n === 0) continue;
    const avgC = agg.sumC / agg.n;
    const avgG = agg.sumG / agg.n;
    const escRate = agg.esc / agg.n;
    out[variantKey] = Math.round((avgC + avgG - escRate * ESCALATION_PENALTY) * 10) / 10;
  }
  return out;
}

export { SUPPRESS_THRESHOLD };
