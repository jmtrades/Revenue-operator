/**
 * Risk Brain — Live Interaction Risk Engine. Deterministic.
 * Returns risk score and safety flags. Used to block unsafe emission.
 */

export interface RiskEngineInput {
  /** Jurisdiction set and not UNSPECIFIED */
  jurisdictionComplete?: boolean;
  /** Required disclosures delivered */
  disclosureStateComplete?: boolean;
  /** Consent obtained where required */
  consentPresent?: boolean;
  /** 0-100 from commitment score */
  volatilityScore?: number;
  /** Legal/sensitive keywords detected in context */
  legalKeywordsDetected?: boolean;
  /** Count of objection-handling cycles */
  objectionCycleCount?: number;
  /** Rate ceiling proximity 0-1 (1 = at limit) */
  rateCeilingProximity?: number;
  /** Escalation loop count */
  escalationLoopCount?: number;
  /** Emotional category from normalizer */
  emotionalCategory?: "calm" | "neutral" | "resistant" | "hostile" | "uncertain" | "positive";
  /** From commitment registry: 2+ broken → requiresReview */
  brokenCommitmentsCount?: number;
}

export interface RiskEngineOutput {
  riskScore: number;
  requiresReview: boolean;
  requiresEscalation: boolean;
  requiresPause: boolean;
}

const REVIEW_THRESHOLD = 60;
const ESCALATION_THRESHOLD = 75;
const PAUSE_THRESHOLD = 90;
const OBJECTION_LOOP_LIMIT = 3;
const ESCALATION_LOOP_LIMIT = 2;

/**
 * Compute risk score and safety flags from structured inputs only.
 * Deterministic. No randomness.
 */
export function evaluateRisk(input: RiskEngineInput): RiskEngineOutput {
  let score = 0;

  if (input.jurisdictionComplete === false) score += 25;
  if (input.disclosureStateComplete === false) score += 20;
  if (input.consentPresent === false) score += 15;
  const vol = Number(input.volatilityScore) || 0;
  score += Math.min(25, Math.round(vol / 4));
  if (input.legalKeywordsDetected === true) score += 20;
  const objCount = Number(input.objectionCycleCount) || 0;
  if (objCount >= OBJECTION_LOOP_LIMIT) score += 15;
  const rateProx = Number(input.rateCeilingProximity) || 0;
  if (rateProx >= 0.8) score += 10;
  const escCount = Number(input.escalationLoopCount) || 0;
  if (escCount >= ESCALATION_LOOP_LIMIT) score += 20;

  const emotional = input.emotionalCategory;
  if (emotional === "hostile") score += 25;
  else if (emotional === "resistant") score += 10;
  else if (emotional === "uncertain") score += 5;

  const brokenCount = Number(input.brokenCommitmentsCount) || 0;
  if (brokenCount >= 2) score += 15;

  const riskScore = Math.min(100, score);
  const requiresReviewFromBroken = brokenCount >= 2;

  return {
    riskScore,
    requiresReview: requiresReviewFromBroken || riskScore >= REVIEW_THRESHOLD,
    requiresEscalation: riskScore >= ESCALATION_THRESHOLD,
    requiresPause: riskScore >= PAUSE_THRESHOLD,
  };
}
