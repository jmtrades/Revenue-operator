import { describe, it, expect } from "vitest";
import { selectToneVariant } from "../src/lib/tone-variation/select";

describe("Tone variation determinism", () => {
  it("returns the same variant for identical inputs", () => {
    const input = {
      domain_type: "finance",
      emotional_signals: {
        urgency_score: 0.3,
        skepticism_score: 0.2,
        compliance_sensitivity: 0.7,
        aggression_level: 0,
        authority_resistance: 0,
        trust_requirement: 0.8,
      },
      objection_count: 1,
    };
    const first = selectToneVariant(input);
    const second = selectToneVariant({ ...input, emotional_signals: { ...input.emotional_signals } });
    expect(first).toBe(second);
    expect(first).toBe("formal");
  });

  it("leans direct on repeated objections and skepticism", () => {
    const variant = selectToneVariant({
      domain_type: "general",
      emotional_signals: {
        urgency_score: 0.2,
        skepticism_score: 0.7,
        compliance_sensitivity: 0.1,
        aggression_level: 0.3,
        authority_resistance: 0,
        trust_requirement: 0.1,
      },
      objection_count: 3,
    });
    expect(variant).toBe("direct");
  });

  it("uses warm tone for relationship-heavy domains by default", () => {
    const variant = selectToneVariant({
      domain_type: "real_estate",
      emotional_signals: {
        urgency_score: 0,
        skepticism_score: 0,
        compliance_sensitivity: 0,
        aggression_level: 0,
        authority_resistance: 0,
        trust_requirement: 0,
      },
      objection_count: 0,
    });
    expect(variant).toBe("warm");
  });
});

