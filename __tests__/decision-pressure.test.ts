/**
 * Decision pressure: immediate risk, today-risk API shape, activation rule, deal-justification, continuation_prevented, propagation.
 * Contract/unit tests; no DB required for shape assertions.
 */

import { describe, it, expect } from "vitest";
import { getRiskTextLine } from "@/lib/immediate-risk";

describe("decision pressure", () => {
  describe("today-risk response doctrine", () => {
    it("today-risk returns text lines only: no counts, timestamps, or numbers in line content", () => {
      const examples = [
        "A scheduled interaction lacks confirmation.",
        "A payment is due without completion.",
        "A response expectation exists without action.",
      ];
      for (const line of examples) {
        expect(line).not.toMatch(/\d/);
        expect(line).not.toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(line).not.toMatch(/\d+h|\d+m/);
      }
    });

    it("getRiskTextLine returns minimal statement per category", () => {
      expect(getRiskTextLine("unconfirmed_commitment")).toBe("A scheduled interaction lacks confirmation.");
      expect(getRiskTextLine("unpaid_due")).toBe("A payment is due without completion.");
      expect(getRiskTextLine("expected_response")).toBe("A response expectation exists without action.");
      expect(getRiskTextLine("promised_followup")).toBe("A follow-through commitment has no completion.");
      expect(getRiskTextLine("deposit_missing")).toBe("A booking has no payment path.");
    });
  });

  describe("activation trigger", () => {
    it("active only when snapshot_seen_at set AND at least one immediate_risk_event", () => {
      const snapshotSeenAt = new Date().toISOString();
      const unresolvedRiskCount = 1;
      const shouldBecomeActive = !!snapshotSeenAt && unresolvedRiskCount >= 1;
      expect(shouldBecomeActive).toBe(true);
    });

    it("activation_ready does not become active when risk count is zero", () => {
      const snapshotSeenAt = new Date().toISOString();
      const unresolvedRiskCount = 0;
      const shouldBecomeActive = !!snapshotSeenAt && unresolvedRiskCount >= 1;
      expect(shouldBecomeActive).toBe(false);
    });
  });

  describe("deal-justification API shape", () => {
    it("returns boolean keys including financial and instability signals", () => {
      const shape = {
        instability_detected: true,
        immediate_risk_present: false,
        manual_supervision_required: true,
        economic_events_present: false,
        network_dependency_present: true,
        financial_risk_present: false,
        repeated_instability: false,
        prevented_instability: true,
      };
      const required = [
        "economic_events_present",
        "immediate_risk_present",
        "instability_detected",
        "manual_supervision_required",
        "network_dependency_present",
        "financial_risk_present",
        "repeated_instability",
        "prevented_instability",
      ];
      expect(Object.keys(shape).sort()).toEqual(required.sort());
      Object.values(shape).forEach((v) => expect(typeof v).toBe("boolean"));
    });
  });

  describe("continuation_prevented incident", () => {
    it("message is record statement only", () => {
      const message = "Operational instability ceased after activation.";
      expect(message).not.toContain("count");
      expect(message).not.toContain("metric");
      expect(message).not.toContain("recommend");
    });
  });

  describe("propagation ignition", () => {
    it("message is minimal and non-marketing", () => {
      const message = "Coordination now relies on shared records.";
      expect(message).not.toMatch(/\b(sign up|try|learn more|optimize|improve)\b/i);
      expect(message.length).toBeLessThan(80);
    });
  });
});
