/**
 * Replay determinism: verify stored lead state equals reducer replay of processed signals.
 * Enforces guarantee #7 demonstrable correctness.
 */

import { getDb } from "@/lib/db/queries";
import { reduceLeadState } from "@/lib/state/reducer";
import { leadStateToLifecycle } from "@/lib/state/types";
import type { LifecycleState } from "@/lib/state/types";
import type { CanonicalSignalType } from "@/lib/signals/types";

export interface ReplayResult {
  match: boolean;
  leadId: string;
  workspaceId: string;
  expectedLifecycle: LifecycleState;
  actualStored: string;
  actualLifecycle: LifecycleState;
}

/**
 * Load all processed canonical signals for lead (ordered by occurred_at), re-run reducer, compare with DB state.
 * Returns result; if mismatch, match is false and caller should log escalation system_integrity_violation.
 */
export async function replayLeadFromSignals(leadId: string, workspaceId: string): Promise<ReplayResult | null> {
  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("id, state")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!lead) return null;

  const { data: signals } = await db
    .from("canonical_signals")
    .select("signal_type, payload, occurred_at")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .not("processed_at", "is", null)
    .order("occurred_at", { ascending: true });
  const list = (signals ?? []) as Array<{ signal_type: CanonicalSignalType; payload: Record<string, unknown>; occurred_at: string }>;

  let state: LifecycleState = "NEW";
  for (const s of list) {
    state = reduceLeadState(state, {
      signal_type: s.signal_type,
      payload: s.payload ?? {},
      occurred_at: s.occurred_at,
    });
  }

  const storedState = (lead as { state?: string | null }).state ?? "";
  const storedLifecycle = leadStateToLifecycle(storedState);
  const match = state === storedLifecycle;

  return {
    match,
    leadId,
    workspaceId,
    expectedLifecycle: state,
    actualStored: storedState,
    actualLifecycle: storedLifecycle,
  };
}
