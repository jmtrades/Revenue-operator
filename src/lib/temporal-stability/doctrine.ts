/**
 * Temporal stability doctrine: documentary tone, factual, ≤90 chars.
 * No ids, no persuasion. Used by presence, public work, proof capsule.
 */

export type StabilityType =
  | "repeated_resolution"
  | "repeated_confirmation"
  | "repeated_settlement"
  | "repeated_followthrough";

export const STATEMENT_PUBLIC_STABILITY =
  "This type of outcome has occurred repeatedly.";

export const STATEMENT_PROOF_STABILITY =
  "Similar outcomes have occurred on separate occasions.";

export const STATEMENT_PRESENCE_STABILITY =
  "Work has remained consistent across occasions.";

export const MAX_CHARS = 90;

const FORBIDDEN = /\b(you|your|we|us|click|optimize|ROI|KPI|dashboard|assistant|metric|percentage)\b/gi;

/** Trim and sanitize for doctrine: cap length, strip forbidden words, collapse spaces. */
export function trimDoctrine(s: string): string {
  const t = s.replace(FORBIDDEN, "").replace(/\s+/g, " ").trim();
  return t.length > MAX_CHARS ? t.slice(0, MAX_CHARS).trim() : t;
}
