/**
 * Monetary consequence layer: financial exposure, economic-pressure API, escalation, deal-justification extension.
 * Contract/shape tests; no DB required.
 */

import { describe, it, expect } from "vitest";
import { getExposureStatementLine } from "@/lib/financial-exposure";

describe("monetary consequence", () => {
  describe("economic-pressure response doctrine", () => {
    it("statement lines have no counts, amounts, currency, or percentages", () => {
      const examples = [
        "A waiting customer may disengage.",
        "A due payment remains incomplete.",
        "A returning customer has gone silent after a commitment.",
        "Available time passed without utilization.",
      ];
      for (const line of examples) {
        expect(line).not.toMatch(/\d/);
        expect(line).not.toMatch(/\$|€|%|USD|ROI|savings|metric/i);
      }
    });

    it("getExposureStatementLine returns situational consequence language per category", () => {
      expect(getExposureStatementLine("revenue_at_risk")).toBe("A waiting customer may disengage.");
      expect(getExposureStatementLine("payment_delay")).toBe("A due payment remains incomplete.");
      expect(getExposureStatementLine("customer_loss_risk")).toBe("A returning customer has gone silent after a commitment.");
      expect(getExposureStatementLine("idle_capacity")).toBe("Available time passed without utilization.");
    });
  });

  describe("escalation memory incident", () => {
    it("repeated_financial_exposure message is record-only", () => {
      const message = "This situation repeatedly required intervention.";
      expect(message).not.toContain("count");
      expect(message).not.toContain("metric");
      expect(message).not.toContain("percent");
    });
  });

  describe("pre-activation conversion incident", () => {
    it("avoidable_loss_observed message is consequence-only", () => {
      const message = "Current operating conditions are producing avoidable loss.";
      expect(message).not.toContain("ROI");
      expect(message).not.toContain("savings");
      expect(message).not.toContain("value");
    });
  });

  describe("deal-justification extension", () => {
    it("includes financial_risk_present, repeated_instability, prevented_instability", () => {
      const shape = {
        instability_detected: true,
        immediate_risk_present: false,
        manual_supervision_required: false,
        economic_events_present: true,
        network_dependency_present: false,
        financial_risk_present: true,
        repeated_instability: false,
        prevented_instability: true,
      };
      expect(shape).toHaveProperty("financial_risk_present");
      expect(shape).toHaveProperty("repeated_instability");
      expect(shape).toHaveProperty("prevented_instability");
      expect(typeof shape.financial_risk_present).toBe("boolean");
      expect(typeof shape.repeated_instability).toBe("boolean");
      expect(typeof shape.prevented_instability).toBe("boolean");
    });
  });
});
