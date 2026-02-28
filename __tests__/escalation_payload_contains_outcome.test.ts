/**
 * Escalation summary includes last_outcome_type, outcome_confidence, broken_commitments_count, etc.
 */

import { describe, it, expect } from "vitest";
import { buildEscalationSummary } from "../src/lib/intelligence/escalation-summary";

describe("Escalation payload contains outcome", () => {
  it("buildEscalationSummary return type includes last_outcome_type, outcome_confidence, last_commitment_status", () => {
    const out = buildEscalationSummary({
      primary_objective: "escalate",
      last_outcome_type: "hostile",
      outcome_confidence: "high",
      last_commitment_status: "open",
    });
    expect(out).toHaveProperty("last_outcome_type", "hostile");
    expect(out).toHaveProperty("outcome_confidence", "high");
    expect(out).toHaveProperty("last_commitment_status", "open");
  });

  it("includes risk_score, cadence_recommendation, what_not_to_say", () => {
    const out = buildEscalationSummary({
      primary_objective: "qualify",
      risk_score: 60,
      cadence_recommendation: "Pause until review.",
      what_not_to_say: ["guarantee"],
    });
    expect(out.risk_score).toBe(60);
    expect(out.cadence_recommendation).toBe("Pause until review.");
    expect(out.what_not_to_say).toEqual(["guarantee"]);
  });

  it("includes broken_commitments", () => {
    const out = buildEscalationSummary({ broken_commitments_count: 2 });
    expect(out.broken_commitments).toBe(2);
  });
});
