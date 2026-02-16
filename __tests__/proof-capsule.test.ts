/**
 * Proof capsule: response keys only; no counts, amounts, dates, ids.
 */
import { describe, it, expect } from "vitest";

const EXPECTED_KEYS = [
  "outcomes_confirmed_last_24h",
  "recovery_executed_last_7d",
  "shared_acknowledgement_exists_last_30d",
  "payment_delay_resolved_last_30d",
] as const;

describe("Proof capsule", () => {
  it("response has only the four boolean keys and no extra metadata", () => {
    const capsule: Record<string, boolean> = {
      outcomes_confirmed_last_24h: false,
      recovery_executed_last_7d: false,
      shared_acknowledgement_exists_last_30d: false,
      payment_delay_resolved_last_30d: false,
    };
    expect(Object.keys(capsule).sort()).toEqual([...EXPECTED_KEYS].sort());
    for (const k of EXPECTED_KEYS) {
      expect(typeof capsule[k]).toBe("boolean");
    }
  });
});
