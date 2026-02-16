/**
 * Exposure engine: operational exposure types and row shape.
 */

export type ExposureType =
  | "reply_delay_risk"
  | "attendance_uncertainty_risk"
  | "payment_stall_risk"
  | "counterparty_unconfirmed_risk"
  | "commitment_outcome_uncertain";

export type SubjectType =
  | "conversation"
  | "commitment"
  | "payment_obligation"
  | "shared_transaction";

export type InterruptionSource =
  | "causal_chain"
  | "continuation_stopped"
  | "coordination_displacement"
  | "resolved_after_intervention";

export interface ExposureRow {
  id: string;
  workspace_id: string;
  exposure_type: ExposureType;
  subject_type: SubjectType;
  subject_id: string;
  related_external_ref: string | null;
  first_observed_at: string;
  last_observed_at: string;
  exposure_resolved_at: string | null;
  interrupted_by_process: boolean;
  interruption_source: InterruptionSource | null;
  recorded_at: string;
}
