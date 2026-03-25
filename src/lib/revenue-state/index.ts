/**
 * Revenue State Engine — top-level classification for loss prevention.
 * Detects risk, chooses intervention, applies safety, optionally messages.
 */

export { computeRevenueState } from "./engine";
export {
  REVENUE_STATES,
  INTERVENTION_TYPES,
  ACTION_TO_INTERVENTION,
  type RevenueState,
  type InterventionType,
  type RevenueStateResult,
} from "./types";
export {
  buildLossPreventionPayload,
  toInterventionType,
  deriveRiskType,
  estimateRevenueLossPrevented,
  type ActionLogLossFields,
} from "./action-log";
