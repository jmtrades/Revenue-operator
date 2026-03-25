/**
 * State Layer — Deterministic, replayable.
 */

export { reduceLeadState } from "./reducer";
export type { SignalForReducer } from "./reducer";
export {
  rebuildLeadStateFromSignals,
  rebuildAndPersistLeadState,
  type RebuildResult,
  type RebuildCheckpoint,
} from "./rebuild";
export {
  LIFECYCLE_STATES,
  lifecycleToLeadState,
  leadStateToLifecycle,
  type LifecycleState,
} from "./types";
