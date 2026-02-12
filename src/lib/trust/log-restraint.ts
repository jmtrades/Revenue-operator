/**
 * Log restraint: when the system delays action and explains why.
 * Must include revenue_state, risk_type, confidence_of_loss, predicted_revenue_loss_prevented, intervention_type when available.
 */

import { getDb } from "@/lib/db/queries";
import { narrativeForRestraint } from "./build-narrative";

export async function logRestraint(
  workspaceId: string,
  leadId: string,
  reason: string,
  details?: Record<string, unknown> & {
    revenue_state?: string;
    risk_type?: string;
    confidence_of_loss?: number;
    predicted_revenue_loss_prevented?: number;
    intervention_type?: string;
  }
): Promise<void> {
  const narrative = narrativeForRestraint(reason, details);
  const db = getDb();
  const payload: Record<string, unknown> = {
    reason,
    noticed: narrative.noticed,
    decision: narrative.decision,
    expected: narrative.expected,
    ...details,
  };
  if (details?.revenue_state) payload.revenue_state = details.revenue_state;
  if (details?.risk_type) payload.risk_type = details.risk_type;
  if (details?.confidence_of_loss != null) payload.confidence_of_loss = details.confidence_of_loss;
  if (details?.predicted_revenue_loss_prevented != null) payload.predicted_revenue_loss_prevented = details.predicted_revenue_loss_prevented;
  if (details?.intervention_type) payload.intervention_type = details.intervention_type;
  await db.from("action_logs").insert({
    workspace_id: workspaceId,
    entity_type: "lead",
    entity_id: leadId,
    action: "restraint",
    actor: "Department",
    role: null,
    payload,
  });
}
