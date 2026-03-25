/**
 * Deterministic micro-variation. Stable selection from SHA-256 hash of threadId + attemptNumber.
 */

import { createHash } from "crypto";

/**
 * Return a deterministic index in [0, length) from a seed string. Same seed → same index.
 */
export function deterministicIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  const hash = createHash("sha256").update(seed).digest("hex");
  const n = parseInt(hash.slice(0, 8), 16);
  return n % length;
}

/**
 * Select a variant deterministically from threadId + attemptNumber. Same inputs → same output.
 */
export function selectDeterministicVariant(
  threadId: string,
  attemptNumber: number,
  variants: string[]
): string {
  if (variants.length === 0) return "";
  if (variants.length === 1) return variants[0];
  const index = deterministicIndex(threadId + String(attemptNumber), variants.length);
  return variants[index] ?? variants[0];
}
