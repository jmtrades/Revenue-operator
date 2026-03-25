/**
 * Proof Layer — Dashboard source of truth.
 * Aggregates revenue_proof only. No heuristics, no inferred metrics.
 */

import { getDb } from "@/lib/db/queries";

export interface ProofAggregates {
  leads_received: number;
  conversations_handled: number;
  bookings_created: number;
  shows_protected: number;
  lost_leads_recovered: number;
}

/**
 * Aggregate proof records for a workspace in a time window.
 * Dashboard must use these counts only.
 */
export async function aggregateProofForWorkspace(
  workspaceId: string,
  options?: { since?: Date }
): Promise<ProofAggregates> {
  const db = getDb();
  const since = options?.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let rows: Array<{ proof_type: string }> = [];
  try {
    const { data } = await db
      .from("revenue_proof")
      .select("proof_type")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since.toISOString());
    rows = data ?? [];
  } catch {
    return {
      leads_received: 0,
      conversations_handled: 0,
      bookings_created: 0,
      shows_protected: 0,
      lost_leads_recovered: 0,
    };
  }

  const count = (type: string) => rows.filter((r) => r.proof_type === type).length;

  return {
    leads_received: count("LeadReceived"),
    conversations_handled: count("SavedConversation"),
    bookings_created: count("NewBooking"),
    shows_protected: count("RecoveredNoShow") + count("RepeatVisit"),
    lost_leads_recovered: count("ReactivatedCustomer"),
  };
}
