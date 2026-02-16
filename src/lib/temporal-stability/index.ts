/**
 * Temporal stability: repeated coherent completion across time.
 * No scoring. No percentages. Only historical fact. Deterministic.
 */

export {
  STATEMENT_PUBLIC_STABILITY,
  STATEMENT_PROOF_STABILITY,
  STATEMENT_PRESENCE_STABILITY,
  MAX_CHARS,
  trimDoctrine,
  type StabilityType,
} from "./doctrine";

export { upsertStabilityRecord, type StabilityRecordPayload } from "./record";

export {
  runTemporalStabilityDetectors,
  MIN_THREADS,
  MIN_DAYS,
} from "./detect";

export {
  workspaceHasTemporalStability,
  workspaceHasMultiDayStability,
  workspaceHadStabilityInPeriod,
} from "./signals";

/** Legacy names for doctrine (same values). */
export {
  STATEMENT_PRESENCE_STABILITY as STATEMENT_WORK_CONSISTENT_ACROSS_OCCASIONS,
  STATEMENT_PUBLIC_STABILITY as STATEMENT_OUTCOME_OCCURRED_REPEATEDLY,
  STATEMENT_PROOF_STABILITY as STATEMENT_SIMILAR_OUTCOMES_SEPARATE_OCCASIONS,
} from "./doctrine";

/** Legacy: alias for runTemporalStabilityDetectors. */
export { runTemporalStabilityDetectors as refreshTemporalStabilityForWorkspace } from "./detect";

/** For public work: thread belongs to stable workspace. */
export { workspaceHasTemporalStability as workspaceHasStabilityForThread } from "./signals";
