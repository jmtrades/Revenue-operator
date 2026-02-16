/**
 * Orientation layer: end-of-outcome records, recent feed, first-check, absence signal, removal shock.
 * No UI. Chronological truth feed only.
 */

export {
  recordOrientationStatement,
  getRecentOrientationStatements,
  updateLastOrientationViewedAt,
  checkAndMarkOrientationChecked,
  hasOrientationRecordOnDate,
  hasOrientationRecordsThreeConsecutiveDays,
  countOrientationRecordsInLastHours,
  getOrientationState,
  setOrientationAbsenceSentToday,
  setOrientationPendingSentToday,
} from "./records";
export { maybeSendOrientationPending } from "./removal-shock";
export { runOrientationAbsenceSignal } from "./absence-signal";
