/**
 * Signal Layer — Persistence
 * Append-only. Duplicate idempotency_key => skip (no double processing).
 */

import { getDb } from "@/lib/db/queries";
import type { CanonicalSignal, CanonicalSignalType } from "./types";

const TABLE = "canonical_signals";

/** After this many process_signal failures for the same signal, mark irrecoverable and escalate so later signals may run. */
export const MAX_SIGNAL_RETRIES = 5;

export type InsertSignalResult = { inserted: true; id: string } | { inserted: false; reason: "duplicate" };

/**
 * Insert one canonical signal. Uses idempotency_key to prevent duplicates.
 * Returns { inserted: true, id } or { inserted: false, reason: 'duplicate' }.
 */
export async function insertSignal(signal: CanonicalSignal): Promise<InsertSignalResult> {
  const db = getDb();
  const row = {
    workspace_id: signal.workspace_id,
    lead_id: signal.lead_id,
    signal_type: signal.signal_type,
    idempotency_key: signal.idempotency_key,
    payload: signal.payload,
    occurred_at: signal.occurred_at,
  };

  const { data, error } = await db
    .from(TABLE)
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { inserted: false, reason: "duplicate" };
    }
    throw error;
  }
  return { inserted: true, id: (data as { id: string }).id };
}

/**
 * Load signals for a lead in order (for replay). Used by state reconstruction.
 */
export async function getSignalsForLead(
  workspaceId: string,
  leadId: string,
  options?: { since?: string; limit?: number }
): Promise<Array<{ id: string; signal_type: CanonicalSignalType; payload: unknown; occurred_at: string }>> {
  const db = getDb();
  let q = db
    .from(TABLE)
    .select("id, signal_type, payload, occurred_at")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: true });
  if (options?.since) {
    q = q.gte("occurred_at", options.since);
  }
  if (options?.limit) {
    q = q.limit(options.limit);
  }
  const { data } = await q;
  return (data ?? []) as Array<{ id: string; signal_type: CanonicalSignalType; payload: unknown; occurred_at: string }>;
}

export interface CanonicalSignalRow {
  id: string;
  workspace_id: string;
  lead_id: string;
  signal_type: CanonicalSignalType;
  payload: Record<string, unknown>;
  occurred_at: string;
  processed_at: string | null;
  failure_reason?: string | null;
}

/**
 * Load one signal by id.
 */
export async function getSignalById(signalId: string): Promise<CanonicalSignalRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE)
    .select("id, workspace_id, lead_id, signal_type, payload, occurred_at, processed_at, failure_reason")
    .eq("id", signalId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CanonicalSignalRow;
}

/**
 * Get signal id by idempotency_key (for reconciliation duplicate path).
 */
export async function getSignalIdByKey(idempotencyKey: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from(TABLE)
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

/**
 * Get signal id and failure_reason by idempotency_key.
 * Used by reconciliation to avoid re-enqueueing process_signal for irrecoverable signals.
 */
export async function getSignalByKey(idempotencyKey: string): Promise<{ id: string; failure_reason: string | null } | null> {
  const db = getDb();
  const { data } = await db
    .from(TABLE)
    .select("id, failure_reason")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (!data) return null;
  return data as { id: string; failure_reason: string | null };
}

/**
 * True if there exists an unprocessed signal for this lead with occurred_at strictly before currentOccurredAt.
 * Used to enforce strict temporal replay: only the earliest pending signal may execute.
 */
export async function hasEarlierUnprocessedSignal(
  workspaceId: string,
  leadId: string,
  currentOccurredAt: string
): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from(TABLE)
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .is("processed_at", null)
    .lt("occurred_at", currentOccurredAt)
    .limit(1)
    .maybeSingle();
  return data != null;
}

/**
 * Set processed_at only after state reducer and persistence have completed.
 * Idempotent: only sets if currently null. Call this at end of processCanonicalSignal.
 * Guarantees: no lead without state, bounded reality drift, demonstrable correctness.
 */
export async function setSignalProcessed(signalId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from(TABLE)
    .update({ processed_at: now })
    .eq("id", signalId)
    .is("processed_at", null);
}

/**
 * Increment signal_processing_attempts for this signal (on each process_signal job failure).
 * Returns the new attempt count. Used to detect retry budget exhaustion.
 */
export async function incrementSignalProcessingAttempts(signalId: string): Promise<number> {
  const db = getDb();
  const { data: row } = await db.from(TABLE).select("signal_processing_attempts").eq("id", signalId).maybeSingle();
  const current = (row as { signal_processing_attempts?: number } | null)?.signal_processing_attempts ?? 0;
  const next = current + 1;
  await db.from(TABLE).update({ signal_processing_attempts: next }).eq("id", signalId);
  return next;
}

/**
 * Mark signal as irrecoverable: set processed_at and failure_reason so it no longer blocks later signals.
 * Atomic and idempotent: update succeeds ONLY if processed_at IS NULL. Returns true if this worker won the race.
 * Do not throw; return false if another worker already handled it.
 */
export async function markSignalIrrecoverable(signalId: string, reason: string): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data } = await db
    .from(TABLE)
    .update({ processed_at: now, failure_reason: reason })
    .eq("id", signalId)
    .is("processed_at", null)
    .select("id")
    .maybeSingle();
  return data != null;
}
