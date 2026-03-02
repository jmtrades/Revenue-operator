/**
 * Closure Layer — Resolve exactly one responsibility state per lead by replaying canonical signals.
 */

import { getDb } from "@/lib/db/queries";
import { getSignalsForLead } from "@/lib/signals/store";
import type { CanonicalSignalType } from "@/lib/signals/types";
import {
  type ResponsibilityState,
  responsibilityFromSignal,
  DEFAULT_RESPONSIBILITY_STATE,
} from "./responsibility";

export class ClosureInvariantViolation extends Error {
  constructor(message: string, public readonly leadId: string) {
    super(message);
    this.name = "ClosureInvariantViolation";
  }
}

export class ClosureConflictViolation extends Error {
  constructor(message: string, public readonly leadId: string) {
    super(message);
    this.name = "ClosureConflictViolation";
  }
}

/**
 * Load canonical signals for lead, replay deterministically, return exactly one ResponsibilityState.
 * If lead has no signals and no open escalation → throw ClosureInvariantViolation.
 * If open escalation exists (unacknowledged), effective state is AWAITING_BUSINESS_DECISION.
 */
export async function resolveResponsibility(leadId: string): Promise<ResponsibilityState> {
  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("id, workspace_id")
    .eq("id", leadId)
    .single();
  if (!lead) {
    throw new ClosureInvariantViolation("lead_not_found", leadId);
  }
  const workspaceId = (lead as { workspace_id: string }).workspace_id;

  const signals = await getSignalsForLead(workspaceId, leadId);
  let state: ResponsibilityState = DEFAULT_RESPONSIBILITY_STATE;
  let _lastMappedAt: string | null = null;

  for (const s of signals) {
    const next = responsibilityFromSignal(s.signal_type as CanonicalSignalType);
    if (next != null) {
      state = next;
      _lastMappedAt = s.occurred_at;
    }
  }

  const { data: escalations } = await db
    .from("escalation_logs")
    .select("id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(10);
  const escalationIds = (escalations ?? []).map((r: { id: string }) => r.id);
  let hasUnacknowledged = false;
  if (escalationIds.length > 0) {
    const { data: acks } = await db.from("handoff_acknowledgements").select("escalation_id").in("escalation_id", escalationIds);
    const ackedSet = new Set((acks ?? []).map((r: { escalation_id: string }) => r.escalation_id));
    hasUnacknowledged = escalationIds.some((id) => !ackedSet.has(id));
  }
  if (hasUnacknowledged) {
    state = "AWAITING_BUSINESS_DECISION";
  }

  if (signals.length === 0 && !hasUnacknowledged) {
    throw new ClosureInvariantViolation("no_signals_no_escalation", leadId);
  }

  return state;
}
