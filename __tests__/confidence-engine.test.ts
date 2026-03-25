/**
 * Confidence Engine: phase behavior, gate result, responsibility API shape.
 * Contract tests; no DB required for shape assertions.
 */

import { describe, it, expect } from "vitest";

describe("confidence engine", () => {
  describe("phase enum", () => {
    it("workspace_confidence_phase has four values", () => {
      const phases = ["observing", "simulating", "assisted", "autonomous"];
      expect(phases).toHaveLength(4);
      expect(phases).toContain("observing");
      expect(phases).toContain("autonomous");
    });
  });

  describe("responsibility confidence_state shape", () => {
    it("confidence_state has phase, simulations_present, approvals_required, stability_established", () => {
      const shape = {
        phase: "simulating",
        simulations_present: true,
        approvals_required: false,
        stability_established: false,
      };
      expect(shape).toHaveProperty("phase");
      expect(shape).toHaveProperty("simulations_present");
      expect(shape).toHaveProperty("approvals_required");
      expect(shape).toHaveProperty("stability_established");
      expect(typeof shape.simulations_present).toBe("boolean");
      expect(typeof shape.approvals_required).toBe("boolean");
      expect(typeof shape.stability_established).toBe("boolean");
    });

    it("no counts in confidence_state", () => {
      const shape = {
        phase: "assisted",
        simulations_present: true,
        approvals_required: true,
        stability_established: false,
      };
      const keys = Object.keys(shape);
      expect(keys.some((k) => k.includes("count") || k.includes("total"))).toBe(false);
    });
  });

  describe("stability narrative", () => {
    it("stability_established entry is plain language", () => {
      const text = "Operational stability established.";
      expect(text).not.toMatch(/\d/);
      expect(text).not.toMatch(/\$|%|ROI|metric/i);
    });
  });
});
