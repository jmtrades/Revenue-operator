/**
 * Incident statements: human-readable value perception. No metrics, no counts.
 * Idempotent by (workspace_id, category, related_external_ref, day).
 */

import { getDb } from "@/lib/db/queries";

export type IncidentCategory =
  | "commitment_saved"
  | "payment_recovered"
  | "opportunity_revived"
  | "dispute_prevented"
  | "no_show_prevented"
  | "long_gap_followup"
  | "returning_customer_drop"
  | "high_value_inquiry_delay"
  | "completed_work_unpaid"
  | "silence_risk_urgent_intent"
  | "promise_followthrough_gap"
  | "deposit_gap_after_booking"
  | "continuation_prevented"
  | "repeated_financial_exposure"
  | "avoidable_loss_observed"
  | "approval_required"
  | "protection_required_authority"
  | "system_drift_detected";

const DEFAULT_MESSAGES: Record<IncidentCategory, string> = {
  commitment_saved: "A commitment would have remained unresolved — outcome restored.",
  payment_recovered: "A payment was incomplete — completion restored.",
  opportunity_revived: "A conversation had stopped — response resumed.",
  dispute_prevented: "A coordination disagreement was avoided through confirmation.",
  no_show_prevented: "Attendance uncertainty resolved before failure.",
  long_gap_followup: "Customer had gone silent after a quote — follow-up restored.",
  returning_customer_drop: "Repeat customer became inactive — re-engagement restored.",
  high_value_inquiry_delay: "High-intent message had no reply — response restored.",
  completed_work_unpaid: "Completed work was unpaid — payment path restored.",
  silence_risk_urgent_intent: "Response delay risk detected — exposure prevented by entry.",
  promise_followthrough_gap: "Follow-through gap detected — outcome risk identified.",
  deposit_gap_after_booking: "Deposit path incomplete — payment exposure identified.",
  continuation_prevented: "Operational instability ceased after activation.",
  repeated_financial_exposure: "This situation repeatedly required intervention.",
  avoidable_loss_observed: "Current operating conditions are producing avoidable loss.",
  approval_required: "An action requires approval before execution.",
  protection_required_authority: "An interruption required human decision.",
  system_drift_detected: "A required system action did not occur.",
};

export function getIncidentMessage(category: IncidentCategory): string {
  return DEFAULT_MESSAGES[category] ?? "An issue was detected and addressed.";
}

/**
 * Create incident statement. Idempotent: same workspace, category, ref, day → no duplicate.
 */
export async function createIncidentStatement(
  workspaceId: string,
  category: IncidentCategory,
  relatedExternalRef?: string | null
): Promise<void> {
  const db = getDb();
  const message = getIncidentMessage(category);
  const { error } = await db.from("incident_statements").insert({
    workspace_id: workspaceId,
    category,
    message,
    related_external_ref: relatedExternalRef ?? null,
  });
  if (error?.code === "23505") return;
  if (error) throw new Error(error.message);
}

export async function getRecentIncidentStatements(
  workspaceId: string,
  limit: number = 5
): Promise<{ category: string; message: string; created_at: string; related_external_ref: string | null }[]> {
  const db = getDb();
  const { data } = await db
    .from("incident_statements")
    .select("category, message, created_at, related_external_ref")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as { category: string; message: string; created_at: string; related_external_ref: string | null }[];
}
