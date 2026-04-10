import { describe, it, expect } from "vitest";
import { interventionToCooldownCategory, hashMessage } from "@/lib/stability/cooldowns";

describe("cooldowns", () => {
  describe("interventionToCooldownCategory", () => {
    it("maps reminder to confirm", () => {
      expect(interventionToCooldownCategory("reminder")).toBe("confirm");
    });
    it("maps prep_info to confirm", () => {
      expect(interventionToCooldownCategory("prep_info")).toBe("confirm");
    });
    it("maps booking to schedule", () => {
      expect(interventionToCooldownCategory("booking")).toBe("schedule");
    });
    it("maps call_invite to schedule", () => {
      expect(interventionToCooldownCategory("call_invite")).toBe("schedule");
    });
    it("maps recovery to revive", () => {
      expect(interventionToCooldownCategory("recovery")).toBe("revive");
    });
    it("maps win_back to revive", () => {
      expect(interventionToCooldownCategory("win_back")).toBe("revive");
    });
    it("maps clarifying_question to clarify", () => {
      expect(interventionToCooldownCategory("clarifying_question")).toBe("clarify");
    });
    it("maps qualification_question to clarify", () => {
      expect(interventionToCooldownCategory("qualification_question")).toBe("clarify");
    });
    it("maps question to clarify", () => {
      expect(interventionToCooldownCategory("question")).toBe("clarify");
    });
    it("maps follow_up to urgency", () => {
      expect(interventionToCooldownCategory("follow_up")).toBe("urgency");
    });
    it("maps greeting to reassurance", () => {
      expect(interventionToCooldownCategory("greeting")).toBe("reassurance");
    });
    it("maps offer to reassurance", () => {
      expect(interventionToCooldownCategory("offer")).toBe("reassurance");
    });
    it("maps next_step to reassurance", () => {
      expect(interventionToCooldownCategory("next_step")).toBe("reassurance");
    });
    it("maps unknown type to reassurance (default)", () => {
      expect(interventionToCooldownCategory("anything_unknown")).toBe("reassurance");
    });
  });

  describe("hashMessage", () => {
    it("returns a string", () => {
      expect(typeof hashMessage("hello world")).toBe("string");
    });
    it("returns consistent hash for same input", () => {
      expect(hashMessage("test message")).toBe(hashMessage("test message"));
    });
    it("returns different hashes for different inputs", () => {
      expect(hashMessage("message A")).not.toBe(hashMessage("message B"));
    });
    it("handles empty string", () => {
      expect(typeof hashMessage("")).toBe("string");
    });
    it("truncates to first 200 chars for hashing", () => {
      const long = "a".repeat(300);
      const long2 = "a".repeat(200) + "b".repeat(100);
      expect(hashMessage(long)).toBe(hashMessage(long2));
    });
  });
});
