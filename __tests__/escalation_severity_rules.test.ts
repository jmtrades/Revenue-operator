/**
 * Escalation severity: 1-5 deterministic. Legal+hostile → 5, broken ≥ 3 → 4, goodwill < 15 → 4, repeated unknown ≥ 3 → 3.
 */

import { describe, it, expect } from "vitest";
import { buildEscalationSummary } from "../src/lib/intelligence/escalation-summary";

describe("Escalation severity rules", () => {
  it("escalation_severity is 1-5", () => {
    const out = buildEscalationSummary({ primary_objective: "escalate" });
    expect(out.escalation_severity).toBeGreaterThanOrEqual(1);
    expect(out.escalation_severity).toBeLessThanOrEqual(5);
  });

  it("severity 5 when last outcome legal_risk or hostile", () => {
    const out = buildEscalationSummary({
      primary_objective: "escalate",
      last_outcome_type_for_severity: "legal_risk",
    });
    expect(out.escalation_severity).toBe(5);
  });

  it("severity 4 when broken_commitments_count >= 3", () => {
    const out = buildEscalationSummary({
      primary_objective: "escalate",
      broken_commitments_count: 3,
    });
    expect(out.escalation_severity).toBe(4);
  });

  it("severity 4 when goodwill_score < 15", () => {
    const out = buildEscalationSummary({
      primary_objective: "escalate",
      goodwill_score: 10,
    });
    expect(out.escalation_severity).toBe(4);
  });

  it("severity 3 when repeated_unknown_count >= 3", () => {
    const out = buildEscalationSummary({
      primary_objective: "escalate",
      repeated_unknown_count: 3,
    });
    expect(out.escalation_severity).toBe(3);
  });

  it("summary includes stage, drift_score, contradiction_score, goodwill_score", () => {
    const out = buildEscalationSummary({
      stage: "objection_handling",
      drift_score: 30,
      contradiction_score: 20,
      goodwill_score: 60,
    });
    expect(out.stage).toBe("objection_handling");
    expect(out.drift_score).toBe(30);
    expect(out.contradiction_score).toBe(20);
    expect(out.goodwill_score).toBe(60);
  });
});
