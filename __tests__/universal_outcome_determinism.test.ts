/**
 * Universal outcome resolver: deterministic. Same input → same output.
 */

import { describe, it, expect } from "vitest";
import { resolveUniversalOutcome, OUTCOME_TYPES, NEXT_REQUIRED_ACTIONS } from "../src/lib/intelligence/outcome-taxonomy";

describe("Universal outcome determinism", () => {
  it("same input yields same outcome_type, outcome_confidence, next_required_action", () => {
    const input = {
      optOut: true,
      voiceOutcome: null,
      consentRecorded: null,
      disclosuresRead: null,
    };
    const a = resolveUniversalOutcome(input);
    const b = resolveUniversalOutcome(input);
    expect(a.outcome_type).toBe(b.outcome_type);
    expect(a.outcome_confidence).toBe(b.outcome_confidence);
    expect(a.next_required_action).toBe(b.next_required_action);
  });

  it("outcome_type is always from allowed OUTCOME_TYPES", () => {
    const inputs = [
      { optOut: true },
      { legalKeywordPresent: true },
      { paymentMade: true },
      { voiceOutcome: "no_answer", attemptCount: 0 },
      { voiceOutcome: "connected", consentRecorded: true, disclosuresRead: true },
    ];
    for (const i of inputs) {
      const r = resolveUniversalOutcome(i);
      expect(OUTCOME_TYPES).toContain(r.outcome_type);
    }
  });

  it("next_required_action is always from allowed NEXT_REQUIRED_ACTIONS", () => {
    const r = resolveUniversalOutcome({ optOut: true });
    expect(NEXT_REQUIRED_ACTIONS).toContain(r.next_required_action);
  });
});
