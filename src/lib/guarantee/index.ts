/**
 * Guarantee Layer — runtime guarantees that enforce outcome progression.
 * Sits above Signal → State → Decision → Action → Proof.
 * Deterministic state monitoring only. No user-visible scoring.
 * Commitment stability (pressure 0–3) is internal only; never exposed in UI.
 */

export type { GuaranteeBreach, InvariantId } from "./invariants";
export {
  RESPONSE_CONTINUITY_MAX_HOURS,
  DECISION_MOMENTUM_MAX_DAYS,
  MAX_CORRECTIVE_ATTEMPTS,
  LIFECYCLE_RETURN_MIN_DAYS,
} from "./invariants";
export { evaluateGuaranteesForLead, countCorrectiveAttempts, type LeadContext } from "./evaluate";
export { enforceBreach, escalateLead } from "./enforce";
export {
  getCommitmentPressure,
  updateCommitmentPressure,
  enforceCommitmentStability,
  shouldEnforceStabilization,
  shouldEscalateCommitment,
  type CommitmentPressureLevel,
  type CommitmentStateRow,
} from "./commitment-stability";
export {
  getCapacityPressure,
  updateCapacityPressure,
  getCapacityInputs,
  computeCapacityPressure,
  isCapacityLimitedOrWorse,
  isCapacityCritical,
  type CapacityPressureLevel,
  type CapacityStateRow,
  type CapacityInputs,
} from "./capacity-stability";
export {
  getEconomicPriority,
  updateEconomicPriority,
  isPriorityLow,
  isPriorityHigh,
  isPriorityCritical,
  type EconomicPriorityLevel,
  type EconomicPriorityRow,
} from "./economic-priority";
export {
  getTemporalUrgency,
  updateTemporalUrgency,
  getSlotPreference,
  isTemporalImmediate,
  isTemporalFlexible,
  isTemporalUrgent,
  type TemporalUrgencyLevel,
  type TemporalUrgencyRow,
  type SlotPreference,
} from "./temporal-urgency";
export {
  getTrajectoryState,
  updateTrajectoryState,
  isDemandOverheated,
  isDemandUnderheated,
  type TrajectoryStateRow,
  type DemandTemperature,
} from "./trajectory";
