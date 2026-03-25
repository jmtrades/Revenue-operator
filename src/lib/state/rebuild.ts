/**
 * State Layer — Rebuild lead state from signals (replay).
 * Admin/ops only. Deterministic: same signals => same result.
 */

import { getSignalsForLead } from "@/lib/signals/store";
import { reduceLeadState } from "./reducer";
import { lifecycleToLeadState, type LifecycleState } from "./types";
import type { CanonicalSignalType } from "@/lib/signals/types";

export interface RebuildCheckpoint {
  signal_id: string;
  occurred_at: string;
  signal_type: CanonicalSignalType;
  state_after: LifecycleState;
}

export interface RebuildResult {
  final_state: LifecycleState;
  lead_state_persisted: string;
  checkpoints: RebuildCheckpoint[];
}

/**
 * Replay all signals for a lead in occurred_at order. Return final state and checkpoints.
 * Does not write to DB; caller may update leads.state if desired (ops only).
 */
export async function rebuildLeadStateFromSignals(
  workspaceId: string,
  leadId: string,
  options?: { since?: string }
): Promise<RebuildResult> {
  const signals = await getSignalsForLead(workspaceId, leadId, { since: options?.since });
  let state: LifecycleState = "NEW";
  const checkpoints: RebuildCheckpoint[] = [];

  for (const row of signals) {
    const sig = {
      signal_type: row.signal_type,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      occurred_at: row.occurred_at,
    };
    state = reduceLeadState(state, sig);
    checkpoints.push({
      signal_id: row.id,
      occurred_at: row.occurred_at,
      signal_type: row.signal_type,
      state_after: state,
    });
  }

  const lead_state_persisted = lifecycleToLeadState(state);
  return { final_state: state, lead_state_persisted, checkpoints };
}

/**
 * Replay and optionally persist. Call from ops-only route with auth.
 */
export async function rebuildAndPersistLeadState(
  workspaceId: string,
  leadId: string
): Promise<RebuildResult> {
  const result = await rebuildLeadStateFromSignals(workspaceId, leadId);
  const db = (await import("@/lib/db/queries")).getDb();
  await db
    .from("leads")
    .update({ status: result.lead_state_persisted, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("workspace_id", workspaceId);
  return result;
}
