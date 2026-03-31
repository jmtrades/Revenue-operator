/**
 * Strategic pattern memory (thread-level). Deterministic guard. No randomness. No provider imports.
 * Prevents repeated macro-strategy attempts that already failed.
 */

import { getDb } from "@/lib/db/queries";
import { appendLedgerEvent } from "@/lib/ops/ledger";
import { log } from "@/lib/logger";

const BOUND_LIMIT = 1;

export interface StrategicPatternRow {
  persuasion_attempts: number;
  clarification_attempts: number;
  compliance_forward_attempts: number;
  hard_close_attempts: number;
  escalation_attempts: number;
  last_updated_at: string;
}

export interface StrategicGuardResult {
  blockVariant?: string;
  forceEscalation?: boolean;
  forcePause?: boolean;
}

/** Variant names that map to pattern columns. */
export const VARIANT_TO_COLUMN = {
  persuasion: "persuasion_attempts",
  direct: "persuasion_attempts",
  gentle: "persuasion_attempts",
  clarification: "clarification_attempts",
  clarify: "clarification_attempts",
  compliance_forward: "compliance_forward_attempts",
  hard_close: "hard_close_attempts",
  firm: "hard_close_attempts",
  escalation: "escalation_attempts",
  handoff: "escalation_attempts",
} as const;

/**
 * Get strategic pattern for thread. Bounded: single row by (workspace_id, thread_id).
 */
export async function getStrategicPattern(
  workspaceId: string,
  threadId: string
): Promise<StrategicPatternRow | null> {
  const db = getDb();
  const { data } = await db
    .from("strategic_pattern_registry")
    .select("persuasion_attempts, clarification_attempts, compliance_forward_attempts, hard_close_attempts, escalation_attempts, last_updated_at")
    .eq("workspace_id", workspaceId)
    .eq("thread_id", threadId.slice(0, 512))
    .limit(BOUND_LIMIT)
    .maybeSingle();
  return data as StrategicPatternRow | null;
}

/**
 * Update strategic pattern: increment the counter for the variant used. UPSERT only.
 */
export async function updateStrategicPattern(
  workspaceId: string,
  threadId: string,
  variantUsed: string
): Promise<{ ok: boolean }> {
  const col = VARIANT_TO_COLUMN[variantUsed as keyof typeof VARIANT_TO_COLUMN] ?? "persuasion_attempts";
  const existing = await getStrategicPattern(workspaceId, threadId);
  const cur = existing ?? {
    persuasion_attempts: 0,
    clarification_attempts: 0,
    compliance_forward_attempts: 0,
    hard_close_attempts: 0,
    escalation_attempts: 0,
    last_updated_at: "",
  };
  const nextVal = ((cur[col as keyof StrategicPatternRow] as number) ?? 0) + 1;
  const db = getDb();
  const tid = threadId.slice(0, 512);
  const row = {
    workspace_id: workspaceId,
    thread_id: tid,
    persuasion_attempts: col === "persuasion_attempts" ? nextVal : (cur.persuasion_attempts ?? 0),
    clarification_attempts: col === "clarification_attempts" ? nextVal : (cur.clarification_attempts ?? 0),
    compliance_forward_attempts: col === "compliance_forward_attempts" ? nextVal : (cur.compliance_forward_attempts ?? 0),
    hard_close_attempts: col === "hard_close_attempts" ? nextVal : (cur.hard_close_attempts ?? 0),
    escalation_attempts: col === "escalation_attempts" ? nextVal : (cur.escalation_attempts ?? 0),
    last_updated_at: new Date().toISOString(),
  };
  try {
    const { error } = await db.from("strategic_pattern_registry").upsert(row, {
      onConflict: "workspace_id,thread_id",
    });
    if (error) return { ok: false };
    await appendLedgerEvent({
      workspaceId,
      eventType: "strategic_pattern_updated",
      severity: "info",
      subjectType: "thread",
      subjectRef: tid.slice(0, 160),
      details: { variant_used: variantUsed },
    }).catch((err: unknown) => { log("warn", "strategic_pattern.ledger_append_failed", { error: err instanceof Error ? err.message : String(err) }); });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Evaluate strategic guard. Deterministic rules only.
 * persuasion_attempts >= 2 AND no commitment delta → disallow persuasion
 * clarification_attempts >= 2 AND open questions unchanged → force escalate
 * compliance_forward_attempts >= 1 AND legal keywords persist → escalation severity 5 (forceEscalation)
 * hard_close_attempts >= 2 AND goodwillScore < 20 → freeze_24h (forcePause)
 * escalation_attempts >= 2 in same thread → require approval (forceEscalation)
 */
export function evaluateStrategicGuard(
  pattern: StrategicPatternRow | null,
  goodwillScore: number,
  commitmentDelta: number,
  openQuestionsUnchanged?: boolean,
  legalKeywordsPersist?: boolean
): StrategicGuardResult {
  const p = pattern ?? {
    persuasion_attempts: 0,
    clarification_attempts: 0,
    compliance_forward_attempts: 0,
    hard_close_attempts: 0,
    escalation_attempts: 0,
    last_updated_at: "",
  };

  if (p.escalation_attempts >= 2) {
    return { forceEscalation: true };
  }
  if (p.hard_close_attempts >= 2 && goodwillScore < 20) {
    return { forcePause: true };
  }
  if (p.compliance_forward_attempts >= 1 && legalKeywordsPersist === true) {
    return { forceEscalation: true };
  }
  if (p.clarification_attempts >= 2 && openQuestionsUnchanged === true) {
    return { forceEscalation: true };
  }
  if (p.persuasion_attempts >= 2 && commitmentDelta === 0) {
    return { blockVariant: "persuasion" };
  }
  return {};
}
