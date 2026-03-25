/**
 * Goodwill model. Deterministic. Clamp 0–100. No GPT. No randomness.
 */

export interface GoodwillInput {
  previousGoodwill?: number | null;
  fulfilledCommitmentsDelta?: number;
  brokenCommitmentsDelta?: number;
  hostileOutcomesDelta?: number;
  legalRiskDelta?: number;
  repeatedNoAnswerLoopsDelta?: number;
  successfulResolution?: boolean;
}

const CLAMP = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const FULFILLED = 15;
const BROKEN = -25;
const HOSTILE = -20;
const LEGAL_RISK = -30;
const NO_ANSWER_LOOP = -10;
const SUCCESSFUL_RESOLUTION = 20;

/**
 * Compute next goodwill score from deltas. Deterministic.
 */
export function computeGoodwill(input: GoodwillInput): number {
  let score = Number(input.previousGoodwill);
  if (Number.isNaN(score)) score = 50;

  score += (input.fulfilledCommitmentsDelta ?? 0) * FULFILLED;
  score += (input.brokenCommitmentsDelta ?? 0) * BROKEN;
  score += (input.hostileOutcomesDelta ?? 0) * HOSTILE;
  score += (input.legalRiskDelta ?? 0) * LEGAL_RISK;
  score += (input.repeatedNoAnswerLoopsDelta ?? 0) * NO_ANSWER_LOOP;
  if (input.successfulResolution === true) score += SUCCESSFUL_RESOLUTION;

  return CLAMP(score);
}

/**
 * Returns true if goodwill < 20 → risk boost.
 */
export function goodwillRequiresRiskBoost(goodwillScore: number): boolean {
  return goodwillScore < 20;
}

/**
 * Returns true if goodwill < 10 → force review.
 */
export function goodwillRequiresForceReview(goodwillScore: number): boolean {
  return goodwillScore < 10;
}
