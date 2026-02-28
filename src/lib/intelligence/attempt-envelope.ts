/**
 * Attempt envelope. No same variant 3x in a row. Deterministic. No randomness.
 */

export type PathVariantKey = "direct" | "gentle" | "firm" | "compliance_forward" | "clarify" | "handoff";

const VARIANT_ORDER: PathVariantKey[] = ["direct", "gentle", "firm", "compliance_forward", "clarify", "handoff"];
const REPEAT_CAP = 3;

export interface AttemptEnvelopeInput {
  previousSnapshot?: { recommended_variant?: string; attempt_number?: number; last_variants_used?: string[] } | null;
  openQuestionsCount: number;
  goodwillScore: number;
  driftScore: number;
  contradictionScore: number;
  isLegalRisk?: boolean;
}

export interface AttemptEnvelopeResult {
  recommended_variant: PathVariantKey;
  attempt_number: number;
}

/**
 * Compute attempt envelope. Never choose same variant 3 times in a row.
 * Open questions => clarify; goodwill low => gentle or handoff; contradiction high => handoff; legal_risk => compliance_forward.
 */
export function computeAttemptEnvelope(input: AttemptEnvelopeInput): AttemptEnvelopeResult {
  const {
    previousSnapshot,
    openQuestionsCount,
    goodwillScore,
    driftScore,
    contradictionScore,
    isLegalRisk,
  } = input;
  const lastUsed = previousSnapshot?.last_variants_used ?? [];
  const attemptNumber = Math.max(1, (previousSnapshot?.attempt_number ?? 0) + 1);

  if (isLegalRisk === true) {
    return { recommended_variant: "compliance_forward", attempt_number: attemptNumber };
  }
  if (openQuestionsCount > 0) {
    return { recommended_variant: "clarify", attempt_number: attemptNumber };
  }
  if (contradictionScore >= 60) {
    return { recommended_variant: "handoff", attempt_number: attemptNumber };
  }
  if (goodwillScore < 20) {
    const avoid = lastUsed.slice(0, REPEAT_CAP);
    const pick = avoid.includes("gentle") && avoid.includes("handoff") ? "handoff" : "gentle";
    return { recommended_variant: pick, attempt_number: attemptNumber };
  }
  if (driftScore >= 70) {
    return { recommended_variant: "handoff", attempt_number: attemptNumber };
  }

  const lastThree = lastUsed.slice(0, REPEAT_CAP);
  const sameCount = (v: PathVariantKey) => lastThree.filter((x) => x === v).length;
  for (const v of VARIANT_ORDER) {
    if (sameCount(v) < REPEAT_CAP) return { recommended_variant: v, attempt_number: attemptNumber };
  }
  return { recommended_variant: "direct", attempt_number: attemptNumber };
}
