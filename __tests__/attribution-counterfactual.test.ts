import { describe, it, expect } from "vitest";
import {
  getCounterfactualForBooking,
  getCounterfactualForAttendance,
  getCounterfactualForRevival,
} from "@/lib/attribution/counterfactual";

describe("counterfactual attribution", () => {
  describe("getCounterfactualForBooking", () => {
    it("returns low probability for recovery attribution", () => {
      const result = getCounterfactualForBooking("Recovery message");
      expect(result.probability_without_intervention).toBe(0.05);
      expect(result.outcome_type).toBe("booking");
    });

    it("returns low probability for win-back attribution", () => {
      const result = getCounterfactualForBooking("Win-back outreach");
      expect(result.probability_without_intervention).toBe(0.05);
    });

    it("returns moderate probability for non-revival attribution", () => {
      const result = getCounterfactualForBooking("Follow-up");
      expect(result.probability_without_intervention).toBe(0.15);
      expect(result.outcome_type).toBe("booking");
    });

    it("returns moderate probability with no attribution", () => {
      const result = getCounterfactualForBooking();
      expect(result.probability_without_intervention).toBe(0.15);
    });

    it("always includes stall_reason", () => {
      const result = getCounterfactualForBooking();
      expect(result.stall_reason).toBeTruthy();
      expect(typeof result.stall_reason).toBe("string");
    });
  });

  describe("getCounterfactualForAttendance", () => {
    it("returns lower probability for reminder attribution", () => {
      const result = getCounterfactualForAttendance("Reminder");
      expect(result.probability_without_intervention).toBe(0.4);
      expect(result.outcome_type).toBe("attendance");
    });

    it("returns lower probability for prep info attribution", () => {
      const result = getCounterfactualForAttendance("Prep info");
      expect(result.probability_without_intervention).toBe(0.4);
    });

    it("returns higher probability without reminder", () => {
      const result = getCounterfactualForAttendance("Other");
      expect(result.probability_without_intervention).toBe(0.55);
    });
  });

  describe("getCounterfactualForRevival", () => {
    it("returns very low probability (revival was critical)", () => {
      const result = getCounterfactualForRevival();
      expect(result.probability_without_intervention).toBe(0.05);
      expect(result.outcome_type).toBe("revival");
      expect(result.stall_reason).toBeTruthy();
    });
  });
});
