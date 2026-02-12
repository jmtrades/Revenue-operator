/**
 * Human-safety layer: predictable, safe, human-acceptable behavior.
 * Optimizes for comfort and reliability over persuasion.
 * Safety runs LAST before send and can override everything.
 */

export {
  enforceHumanAcceptability,
  type SafetyContext,
  type SafetyResult,
} from "./behavior-contract";
export { filterAwkwardness } from "./awkwardness-filter";
export { checkOwnershipBoundary } from "./ownership-boundary";
export {
  detectDisinterest,
  isLowPressureMode,
  setLowPressureMode,
  type DisinterestResult,
} from "./disinterest-detector";
export { applyBlameShield } from "./blame-shield";
export { enforceSimplicity } from "./simplicity-enforcer";
