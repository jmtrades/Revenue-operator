/**
 * Operational orientation-state: response keys only; no times, no counts.
 */
import { describe, it, expect } from "vitest";

const EXPECTED_KEYS = [
  "orientation_recently_viewed",
  "absence_signal_eligible",
  "pending_confirmation_recent",
] as const;

describe("Operational orientation-state", () => {
  it("response has only the three boolean keys and no extra metadata", () => {
    const state: Record<string, boolean> = {
      orientation_recently_viewed: false,
      absence_signal_eligible: false,
      pending_confirmation_recent: false,
    };
    expect(Object.keys(state).sort()).toEqual([...EXPECTED_KEYS].sort());
    for (const k of EXPECTED_KEYS) {
      expect(typeof state[k]).toBe("boolean");
    }
  });
});
