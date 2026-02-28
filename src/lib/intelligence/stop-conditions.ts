/**
 * Universal stop conditions. When present, execution MUST NOT send.
 * Downgrade to preview / escalate / pause only. Deterministic.
 */

export type StopReason =
  | "risk_threshold"
  | "jurisdiction_unspecified"
  | "consent_missing"
  | "disclosure_incomplete"
  | "objection_chain_exceeded"
  | "attempt_limit_exceeded"
  | "rate_headroom_exhausted"
  | "execution_stale"
  | "compliance_lock"
  | "cadence_restriction"
  | "hostile_cooldown"
  | "broken_commitment_threshold"
  | "outcome_requires_pause"
  | "excessive_hostility_loop"
  | "repeated_unknown_outcome";

export interface StopConditionsInput {
  riskScore: number;
  jurisdictionComplete: boolean;
  consentPresent: boolean;
  disclosureComplete: boolean;
  objectionChainCount: number;
  attemptCount: number;
  rateHeadroom: number;
  executionStale: boolean;
  complianceLock: boolean;
  maxObjectionChain?: number;
  maxAttemptsPerLead?: number;
  /** From cadence governor: not allow → stop */
  cadenceResult?: "allow" | "cool_off" | "freeze_24h" | "escalate";
  brokenCommitmentsCount?: number;
  /** Last outcome type from taxonomy: opted_out, legal_risk → pause */
  lastOutcomeType?: string | null;
  /** Consecutive hostility count; threshold triggers pause */
  hostilityLoopCount?: number;
  /** Consecutive unknown outcome count; threshold triggers escalate */
  repeatedUnknownCount?: number;
  hostilityLoopThreshold?: number;
  repeatedUnknownThreshold?: number;
}

/**
 * Evaluate stop conditions. Returns first matching reason or null.
 * If non-null, caller MUST NOT send; must emit preview, escalate, or pause.
 */
export function evaluateStopConditions(input: StopConditionsInput): StopReason | null {
  const {
    riskScore,
    jurisdictionComplete,
    consentPresent,
    disclosureComplete,
    objectionChainCount,
    attemptCount,
    rateHeadroom,
    executionStale,
    complianceLock,
    maxObjectionChain = 3,
    maxAttemptsPerLead = 10,
    cadenceResult,
    brokenCommitmentsCount = 0,
    lastOutcomeType,
    hostilityLoopCount = 0,
    repeatedUnknownCount = 0,
    hostilityLoopThreshold = 3,
    repeatedUnknownThreshold = 3,
  } = input;

  if (riskScore >= 75) return "risk_threshold";
  if (!jurisdictionComplete) return "jurisdiction_unspecified";
  if (!consentPresent) return "consent_missing";
  if (!disclosureComplete) return "disclosure_incomplete";
  if (objectionChainCount >= maxObjectionChain) return "objection_chain_exceeded";
  if (attemptCount >= maxAttemptsPerLead) return "attempt_limit_exceeded";
  if (rateHeadroom <= 0) return "rate_headroom_exhausted";
  if (executionStale) return "execution_stale";
  if (complianceLock) return "compliance_lock";
  if (cadenceResult === "freeze_24h") return "hostile_cooldown";
  if (cadenceResult === "cool_off" || cadenceResult === "escalate") return "cadence_restriction";
  if (brokenCommitmentsCount >= 2) return "broken_commitment_threshold";
  if (lastOutcomeType === "opted_out" || lastOutcomeType === "legal_risk") return "outcome_requires_pause";
  if (hostilityLoopCount >= hostilityLoopThreshold) return "excessive_hostility_loop";
  if (repeatedUnknownCount >= repeatedUnknownThreshold) return "repeated_unknown_outcome";

  return null;
}
