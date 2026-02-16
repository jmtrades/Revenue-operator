/**
 * Per-lead advisory lock for signal processing. Prevents concurrent processCanonicalSignal for same lead.
 */

import { getDb } from "@/lib/db/queries";

const LOCK_TTL_MS = 2 * 60 * 1000;

/**
 * Try to acquire lock for this lead. Returns true if acquired, false if another worker holds it.
 * Call releaseLeadLock after processing.
 */
export async function acquireLeadLock(leadId: string): Promise<boolean> {
  const db = getDb();
  const now = new Date();
  const lockUntil = new Date(now.getTime() + LOCK_TTL_MS).toISOString();
  const nowIso = now.toISOString();

  const { data, error } = await db
    .from("leads")
    .update({
      signal_processing_lock_until: lockUntil,
      updated_at: nowIso,
    })
    .eq("id", leadId)
    .or(`signal_processing_lock_until.is.null,signal_processing_lock_until.lt.${nowIso}`)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data != null;
}

/**
 * Release lock after processing.
 */
export async function releaseLeadLock(leadId: string): Promise<void> {
  const db = getDb();
  await db
    .from("leads")
    .update({ signal_processing_lock_until: null, updated_at: new Date().toISOString() })
    .eq("id", leadId);
}
