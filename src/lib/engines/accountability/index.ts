/**
 * Accountability Engine — Counterfactual analysis for every executed action.
 * probability_without_intervention, probability_with_intervention, delta, outcome.
 */

import { getDb } from "@/lib/db/queries";
import {
  getCounterfactualForBooking,
  getCounterfactualForAttendance,
  getCounterfactualForRevival,
  type CounterfactualOutcome,
} from "@/lib/attribution/counterfactual";

export interface OutcomeAttribution {
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  action_log_id?: string;
  probability_without_intervention: number;
  probability_with_intervention: number;
  delta: number;
  outcome: string;
}

/** Record counterfactual for an executed action. */
export async function recordOutcomeAttribution(
  workspaceId: string,
  entityType: string,
  entityId: string,
  action: string,
  counterfactual: CounterfactualOutcome,
  actionLogId?: string
): Promise<void> {
  const probWithout = counterfactual.probability_without_intervention;
  const probWith = 1 - probWithout;
  const delta = probWith - probWithout;

  const db = getDb();
  await db.from("outcome_attribution").insert({
    workspace_id: workspaceId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    action_log_id: actionLogId,
    probability_without_intervention: probWithout,
    probability_with_intervention: probWith,
    delta,
    outcome: counterfactual.outcome_type,
  });
}

/** Get counterfactual for event (booking, call_completed, etc). */
export function getCounterfactualForAction(
  action: string,
  attributedTo?: string
): CounterfactualOutcome {
  if (action === "booking_created") return getCounterfactualForBooking(attributedTo);
  if (action === "call_completed") {
    if (attributedTo === "Recovery message" || attributedTo === "Win-back outreach") {
      return getCounterfactualForRevival();
    }
    return getCounterfactualForAttendance(attributedTo);
  }
  return {
    probability_without_intervention: 0.3,
    stall_reason: "Intervention improved outcome likelihood.",
    outcome_type: "booking",
  };
}
