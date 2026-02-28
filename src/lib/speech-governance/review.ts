/**
 * Deterministic review gate: high-risk intents require human review.
 * No legal advice; generic categories only.
 */

const REVIEW_REQUIRED_INTENTS = new Set([
  "lending_claim",
  "finance_claim",
  "screening_outcome",
  "legal_terms",
  "medical_topic",
  "housing_eligibility",
  "contract_promise",
  "dispute_resolution",
]);

const REVIEW_REQUIRED_DOMAINS = new Set(["real_estate", "finance", "healthcare"]);

export function requiresReview(
  intentType: string,
  domainType: string,
  jurisdiction: string
): boolean {
  if (REVIEW_REQUIRED_INTENTS.has(intentType)) return true;
  if (REVIEW_REQUIRED_DOMAINS.has(domainType)) {
    if (intentType === "outcome_confirmation" || intentType === "dispute_resolution") return true;
  }
  return false;
}
