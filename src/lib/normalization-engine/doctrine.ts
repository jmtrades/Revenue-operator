/**
 * Normalization engine: allowed strings. No numbers, ≤90 chars, factual only.
 */

export const MAX_LINE_LEN = 90;

export const NORMALIZATION_ORIENTATION_STATEMENT = "The process became treated as part of normal operation.";

export const PROOF_CAPSULE_NORMALIZATION_LINE = "Work proceeded without verification.";

export const NORMALIZATION_TYPES = [
  "verification_absent",
  "direct_progression",
  "silent_acceptance",
  "uninterrupted_followthrough",
] as const;

export type NormalizationType = (typeof NORMALIZATION_TYPES)[number];

export function trimDoctrine(s: string): string {
  return s.length > MAX_LINE_LEN ? s.slice(0, MAX_LINE_LEN).trim() : s;
}
