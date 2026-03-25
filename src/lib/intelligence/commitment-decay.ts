/**
 * Time-based commitment decay. Trust decays when silence persists. No timers. No background jobs.
 */

const CLAMP_MIN = 0;
const CLAMP_MAX = 100;

export interface ApplyCommitmentDecayInput {
  lastMeaningfulOutcomeAt: string | null;
  openCommitmentsCount: number;
  daysSinceLastResponse: number;
  goodwillScore: number;
  /** Open commitments older than this (days) add friction. */
  unresolvedCommitmentDaysThreshold?: number;
}

export interface CommitmentDecayResult {
  goodwillDelta: number;
  frictionDelta: number;
  adjustedGoodwill: number;
  adjustedFriction: number;
}

/**
 * Apply commitment decay. Deterministic.
 * 3 days silence → goodwill −5; 7 days → −10; 14 days → −20.
 * Open commitments unresolved >7 days → friction +10.
 */
export function applyCommitmentDecay(input: ApplyCommitmentDecayInput): CommitmentDecayResult {
  const {
    goodwillScore,
    daysSinceLastResponse,
    openCommitmentsCount,
    unresolvedCommitmentDaysThreshold = 7,
  } = input;
  let goodwillDelta = 0;
  if (daysSinceLastResponse >= 14) goodwillDelta = -20;
  else if (daysSinceLastResponse >= 7) goodwillDelta = -10;
  else if (daysSinceLastResponse >= 3) goodwillDelta = -5;

  let frictionDelta = 0;
  if (openCommitmentsCount > 0 && daysSinceLastResponse >= unresolvedCommitmentDaysThreshold) {
    frictionDelta = 10;
  }

  const adjustedGoodwill = Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, goodwillScore + goodwillDelta));
  const baseFriction = 0;
  const adjustedFriction = Math.max(0, Math.min(100, baseFriction + frictionDelta));
  return {
    goodwillDelta,
    frictionDelta,
    adjustedGoodwill,
    adjustedFriction,
  };
}
