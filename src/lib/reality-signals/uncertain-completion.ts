/**
 * Uncertain completion: internal completion without shared confirmation.
 * Deterministic: checks reciprocal events vs acknowledgement state.
 */

import { getDb } from "@/lib/db/queries";

/**
 * True when thread has internal completion event but no acknowledgement.
 */
export async function hasUncertainCompletion(threadId: string): Promise<boolean> {
  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("state, acknowledged_at")
    .eq("id", threadId)
    .maybeSingle();
  if (!tx) return false;
  const state = (tx as { state: string; acknowledged_at: string | null }).state;
  const acknowledgedAt = (tx as { acknowledged_at: string | null }).acknowledged_at;
  if (state === "acknowledged" || acknowledgedAt) return false;
  const { data: completionEvents } = await db
    .from("reciprocal_events")
    .select("id")
    .eq("thread_id", threadId)
    .in("operational_action", ["completed", "resolved", "finished"])
    .limit(1);
  return (completionEvents?.length ?? 0) > 0;
}
