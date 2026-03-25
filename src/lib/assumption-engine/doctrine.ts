/**
 * Assumption engine: allowed strings and caps. No numbers, ≤90 chars, factual only.
 */

export const MAX_LINE_LEN = 90;

export const ASSUMPTION_ORIENTATION_STATEMENT = "The process became expected in normal operation.";

export const PROOF_CAPSULE_ASSUMPTION_LINE = "Work proceeded assuming the process.";

export const ASSUMPTION_TYPES = [
  "outcome_presumed",
  "dependency_action_taken",
  "absence_only_attention",
] as const;

export type AssumptionType = (typeof ASSUMPTION_TYPES)[number];

export function trimDoctrine(s: string): string {
  return s.length > MAX_LINE_LEN ? s.slice(0, MAX_LINE_LEN).trim() : s;
}
