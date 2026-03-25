export type { ExposureType, SubjectType, InterruptionSource, ExposureRow } from "./types";
export { EXPOSURE_LINES, FIRST_INTERRUPTION_ORIENTATION, PROOF_CAPSULE_PROTECTION_LINE, hasForbiddenWords, hasNumbers, sanitizeLine, MAX_LINE_LEN } from "./doctrine";
export { upsertExposure, markExposureResolved, getInterruptedExposureLinesLast24h, hasInterruptedExposureLast24h } from "./record";
export {
  detectReplyDelayRisk,
  detectAttendanceUncertaintyRisk,
  detectPaymentStallRisk,
  detectCounterpartyUnconfirmedRisk,
  detectCommitmentOutcomeUncertain,
} from "./detect";
export {
  resolveExposureFromCausalChain,
  resolveExposureFromContinuation,
  resolveExposureFromDisplacement,
} from "./resolve";
export { recordFirstInterruptionOrientationOnce } from "./orientation";
