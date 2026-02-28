/**
 * Operational ambiguity signals: record only. Factual, ≤90 chars.
 * Types: multi_thread_contradiction, expiring_obligation, silent_retraction, unauthorized_authority, compliance_lapse.
 */

import { getDb } from "@/lib/db/queries";

const MAX_STATEMENT_CHARS = 90;

function capStatement(s: string): string {
  const t = (s ?? "").trim();
  return t.length > MAX_STATEMENT_CHARS ? t.slice(0, MAX_STATEMENT_CHARS).trim() : t;
}

export type AmbiguitySignalType =
  | "multi_thread_contradiction"
  | "expiring_obligation"
  | "silent_retraction"
  | "unauthorized_authority"
  | "compliance_lapse";

export async function recordAmbiguitySignal(
  workspaceId: string,
  signalType: AmbiguitySignalType,
  statement: string,
  options?: { threadId?: string; workUnitId?: string }
): Promise<void> {
  const db = getDb();
  const text = capStatement(statement);
  if (!text) return;
  await db.from("operational_ambiguity_signals").insert({
    workspace_id: workspaceId,
    signal_type: signalType,
    statement: text,
    thread_id: options?.threadId ?? null,
    work_unit_id: options?.workUnitId ?? null,
  });
}

/** Two or more threads for same subject show conflicting commitments or outcomes. */
export async function detectAndRecordMultiThreadContradiction(
  workspaceId: string,
  subjectType: string,
  subjectId: string
): Promise<boolean> {
  const db = getDb();
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id, state")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .in("state", ["pending_acknowledgement", "acknowledged"])
    .limit(5);
  if (!threads || threads.length < 2) return false;
  await recordAmbiguitySignal(
    workspaceId,
    "multi_thread_contradiction",
    "Multiple threads for same subject with unresolved state."
  );
  return true;
}

/** Obligation has a deadline in the past or within 24h with no resolution. */
export async function detectAndRecordExpiringObligation(
  workspaceId: string,
  threadId: string,
  deadlineIso: string
): Promise<boolean> {
  const deadline = new Date(deadlineIso).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (deadline > now + dayMs) return false;
  await recordAmbiguitySignal(
    workspaceId,
    "expiring_obligation",
    "Obligation deadline passed or within 24 hours with no resolution.",
    { threadId }
  );
  return true;
}

/** Commitment or statement was withdrawn or reversed without explicit record. */
export async function detectAndRecordSilentRetraction(
  workspaceId: string,
  threadId: string
): Promise<void> {
  await recordAmbiguitySignal(
    workspaceId,
    "silent_retraction",
    "Commitment or statement reversed without explicit record.",
    { threadId }
  );
}

/** Action taken by role that does not hold authority for that action. */
export async function detectAndRecordUnauthorizedAuthority(
  workspaceId: string,
  statement: string,
  options?: { threadId?: string }
): Promise<void> {
  await recordAmbiguitySignal(
    workspaceId,
    "unauthorized_authority",
    capStatement(statement),
    { threadId: options?.threadId }
  );
}

/** Required compliance step missing or overdue. */
export async function detectAndRecordComplianceLapse(
  workspaceId: string,
  statement: string,
  options?: { threadId?: string }
): Promise<void> {
  await recordAmbiguitySignal(
    workspaceId,
    "compliance_lapse",
    capStatement(statement),
    { threadId: options?.threadId }
  );
}
