/**
 * Cadence Governor — human pacing. Deterministic. No randomness.
 * Returns allow | cool_off | freeze_24h | escalate. Wire before decision; if not allow → never send.
 */

export type CadenceResult = "allow" | "cool_off" | "freeze_24h" | "escalate";

export interface EvaluateCadenceInput {
  lastContactAt: string | null;
  contactCount24h: number;
  volatilityScore: number;
  emotionalCategory: string | null;
  attemptCount48h: number;
  brokenCommitmentsExist: boolean;
  /** Threshold for contact count in 24h */
  contactCount24hThreshold?: number;
}

const DEFAULT_CONTACT_24H_THRESHOLD = 5;
const ATTEMPT_48H_COOL_OFF = 3;

/**
 * Evaluate cadence. Deterministic rules only.
 */
export function evaluateCadence(input: EvaluateCadenceInput): CadenceResult {
  const {
    volatilityScore = 0,
    emotionalCategory,
    attemptCount48h = 0,
    brokenCommitmentsExist,
    contactCount24h = 0,
    contactCount24hThreshold = DEFAULT_CONTACT_24H_THRESHOLD,
  } = input;

  if (emotionalCategory === "hostile" && volatilityScore > 70) return "freeze_24h";
  if (attemptCount48h > ATTEMPT_48H_COOL_OFF) return "cool_off";
  if (contactCount24h >= contactCount24hThreshold) return "cool_off";
  if (brokenCommitmentsExist) return "escalate";

  return "allow";
}
