/**
 * Escalation summary: expanded fields (open_commitments, broken_commitments, last_3_actions, etc.).
 */

import { describe, it, expect } from "vitest";
import { buildEscalationSummary } from "../src/lib/intelligence/escalation-summary";

describe("Escalation summary expanded", () => {
  it("includes open_commitments, broken_commitments, last_3_actions", () => {
    const out = buildEscalationSummary({
      primary_objective: "escalate",
      open_commitments: [{ commitment_type: "call_back", promised_for: "2025-01-01" }],
      broken_commitments_count: 1,
      last_3_actions: [{ intent_type: "send_message", at: "2025-01-01T00:00:00Z" }],
    });
    expect(out).toHaveProperty("open_commitments");
    expect(Array.isArray(out.open_commitments)).toBe(true);
    expect(out.open_commitments).toHaveLength(1);
    expect(out).toHaveProperty("broken_commitments", 1);
    expect(out).toHaveProperty("last_3_actions");
    expect(Array.isArray(out.last_3_actions)).toBe(true);
  });

  it("includes commitment_score_snapshot, volatility_score, regulatory_constraints_snapshot", () => {
    const out = buildEscalationSummary({
      primary_objective: "qualify",
      volatility_score: 30,
      regulatory_constraints_snapshot: ["Disclaimer A"],
    });
    expect(out).toHaveProperty("commitment_score_snapshot");
    expect(out).toHaveProperty("volatility_score", 30);
    expect(out).toHaveProperty("regulatory_constraints_snapshot");
    expect(out.regulatory_constraints_snapshot).toEqual(["Disclaimer A"]);
  });

  it("includes cadence_recommendation and what_not_to_say", () => {
    const out = buildEscalationSummary({
      primary_objective: "route",
      cadence_recommendation: "Pause until review.",
      what_not_to_say: ["guarantee", "advice"],
    });
    expect(out).toHaveProperty("cadence_recommendation");
    expect(out.cadence_recommendation).toBe("Pause until review.");
    expect(out).toHaveProperty("what_not_to_say");
    expect(out.what_not_to_say).toEqual(["guarantee", "advice"]);
  });

  it("recommended_next_move reflects broken commitments when >= 2", () => {
    const out = buildEscalationSummary({
      primary_objective: "qualify",
      broken_commitments_count: 2,
    });
    expect(out.recommended_next_move).toContain("broken commitments");
  });
});
