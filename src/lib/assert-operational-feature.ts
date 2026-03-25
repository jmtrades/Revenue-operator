/**
 * Future feature filter: purpose must reduce human awareness.
 * If purpose does not reduce awareness required → throw.
 * All new engines must declare purpose that aligns with operational infrastructure.
 */

const AWARENESS_REDUCING_KEYWORDS = [
  "continuity",
  "momentum",
  "conclude",
  "resolve",
  "handoff",
  "escalat",
  "prevent",
  "stall",
  "complete",
  "certainty",
  "reliability",
  "proof",
  "closure",
  "reconcil",
];

/**
 * Assert that a feature's purpose reduces human awareness (user can forget the system).
 * Throws if purpose is missing or does not imply reduced awareness.
 */
export function assertOperationalFeature(purpose: string): void {
  if (!purpose || typeof purpose !== "string" || purpose.length < 10) {
    throw new Error("assertOperationalFeature: purpose must be a non-empty string (reduces awareness)");
  }
  const lower = purpose.toLowerCase();
  const reducesAwareness = AWARENESS_REDUCING_KEYWORDS.some((k) => lower.includes(k));
  if (!reducesAwareness) {
    throw new Error(
      `assertOperationalFeature: purpose must reduce human awareness. Got: "${purpose.slice(0, 80)}..."`
    );
  }
}
