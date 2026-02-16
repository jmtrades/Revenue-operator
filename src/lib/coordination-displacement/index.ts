/**
 * Coordination displacement: decisions made using the system instead of human clarification.
 * No prediction. Observable operational facts only.
 */

export type { ActorType, DecisionType } from "./types";
export {
  recordCoordinationDisplacement,
  countDisplacementInLastDays,
  getDisplacementLinesInLastDays,
  hasCounterpartyConfirmationDisplacementInLastDays,
} from "./record";
