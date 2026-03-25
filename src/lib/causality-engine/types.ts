/**
 * Causality engine: dependency of outcomes on intervention.
 * Deterministic: timing + state transitions only. No probabilities, no AI.
 */

export type InterventionType =
  | "commitment_recovery"
  | "opportunity_revival"
  | "payment_recovery"
  | "shared_transaction_ack";

export type BaselineOutcome =
  | "not_confirmed"
  | "no_reply"
  | "unpaid"
  | "unacknowledged";

export type ObservedOutcome =
  | "confirmed"
  | "reply_received"
  | "paid"
  | "acknowledged";

export interface CausalChainInput {
  workspace_id: string;
  subject_type: string;
  subject_id: string;
  baseline_expected_outcome: BaselineOutcome | string;
  intervention_type: InterventionType;
  observed_outcome: ObservedOutcome | string;
  dependency_established: boolean;
}
