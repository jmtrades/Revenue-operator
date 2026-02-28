/**
 * Deterministic path variant selection. Human-like variability without freeform.
 * Used only to pick template variant or voice script sub-branch. No text generation.
 * When variantScores provided, suppress variants with score below threshold; use deterministic hash if multiple remain.
 */

import type { CommitmentState } from "./commitment-score";
import type { EmotionalCategory } from "./emotional-normalizer";
import { selectDeterministicVariant } from "./deterministic-variant";
import { SUPPRESS_THRESHOLD } from "./strategy-effectiveness";

export type PathVariantKey =
  | "direct"
  | "gentle"
  | "firm"
  | "compliance_forward"
  | "clarify"
  | "handoff";

export const PATH_VARIANT_KEYS: PathVariantKey[] = [
  "direct",
  "gentle",
  "firm",
  "compliance_forward",
  "clarify",
  "handoff",
];

export interface SelectPathVariantInput {
  commitmentState?: CommitmentState | null;
  emotionalCategory?: EmotionalCategory | null;
  objective?: string | null;
  attemptNumber: number;
  /** When provided, variants with score < SUPPRESS_THRESHOLD are suppressed. */
  variantScores?: Record<string, number> | null;
  /** For deterministic selection among allowed variants when natural pick is suppressed. */
  threadId?: string | null;
}

/**
 * Select path variant deterministically. No randomness.
 * If variantScores provided, natural pick is suppressed when score < threshold; then pick from allowed via hash.
 */
export function selectPathVariant(input: SelectPathVariantInput): PathVariantKey {
  const { commitmentState, emotionalCategory, objective, attemptNumber, variantScores, threadId } = input;
  const friction = commitmentState?.frictionScore ?? 50;
  const volatility = commitmentState?.volatilityScore ?? 0;
  const emotional = emotionalCategory ?? "neutral";

  let natural: PathVariantKey;
  if (emotional === "hostile" || emotional === "resistant") natural = "handoff";
  else if (objective === "escalate") natural = "handoff";
  else if (volatility >= 70) natural = "gentle";
  else if (friction >= 70) natural = "clarify";
  else if (objective === "confirm" || objective === "protect_compliance") natural = "compliance_forward";
  else if (attemptNumber >= 3 && friction >= 50) natural = "firm";
  else if (emotional === "uncertain") natural = "clarify";
  else if (emotional === "positive") natural = "direct";
  else natural = "direct";

  if (!variantScores || typeof variantScores !== "object") return natural;
  const score = variantScores[natural];
  if (score !== undefined && score >= SUPPRESS_THRESHOLD) return natural;
  const allowed = PATH_VARIANT_KEYS.filter((k) => (variantScores[k] ?? 0) >= SUPPRESS_THRESHOLD);
  if (allowed.length === 0) return natural;
  return selectDeterministicVariant(threadId ?? "", attemptNumber, allowed) as PathVariantKey;
}
