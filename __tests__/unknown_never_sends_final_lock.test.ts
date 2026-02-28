/**
 * Unknown never sends: when outcome is unknown or drift/contradiction high or repeated
 * clarifications, decision must be emit_preview or emit_approval (never send).
 * next_required_action must be clarify or escalate_to_human.
 */

import { describe, it, expect } from "vitest";
import { resolveUniversalOutcome } from "../src/lib/intelligence/outcome-taxonomy";

describe("unknown never sends final lock", () => {
  it("minimal input (unknown) returns next_required_action that blocks send", () => {
    const result = resolveUniversalOutcome({});
    expect(result.outcome_type).toBe("unknown");
    expect(result.next_required_action).not.toBe("none");
    expect(["request_disclosure_confirmation", "escalate_to_human"]).toContain(result.next_required_action);
  });

  it("repeated unknown outcomes return escalate_to_human", () => {
    const result = resolveUniversalOutcome({
      lastOutcomeTypes: ["unknown", "unknown", "unknown"],
      repeatedUnknownThreshold: 3,
    });
    expect(result.outcome_type).toBe("unknown");
    expect(result.next_required_action).toBe("escalate_to_human");
  });

  it("unknown with empty lastOutcomeTypes returns request_disclosure_confirmation", () => {
    const result = resolveUniversalOutcome({ lastOutcomeTypes: [] });
    expect(result.outcome_type).toBe("unknown");
    expect(result.next_required_action).toBe("request_disclosure_confirmation");
  });

  it("unknown outcome never has next_required_action none", () => {
    const inputs = [
      {},
      { messageResultStatus: "failed", voiceOutcome: null },
      { lastOutcomeTypes: ["unknown"], repeatedUnknownThreshold: 3 },
    ];
    for (const input of inputs) {
      const result = resolveUniversalOutcome(input);
      if (result.outcome_type === "unknown") {
        expect(result.next_required_action).not.toBe("none");
      }
    }
  });
});
