import { describe, it, expect } from "vitest";
import { messageIndicatesOptOut } from "@/lib/lead-opt-out/index";

describe("lead opt-out", () => {
  describe("messageIndicatesOptOut", () => {
    it("detects bare STOP", () => {
      expect(messageIndicatesOptOut("STOP")).toBe(true);
    });

    it("detects lowercase stop", () => {
      expect(messageIndicatesOptOut("stop")).toBe(true);
    });

    it("detects STOP with whitespace", () => {
      expect(messageIndicatesOptOut("  STOP  ")).toBe(true);
    });

    it("detects UNSUBSCRIBE", () => {
      expect(messageIndicatesOptOut("UNSUBSCRIBE")).toBe(true);
    });

    it("detects unsubscribe lowercase", () => {
      expect(messageIndicatesOptOut("unsubscribe")).toBe(true);
    });

    it("detects STOP in short message", () => {
      expect(messageIndicatesOptOut("Please STOP")).toBe(true);
    });

    it("does not detect STOP in long message", () => {
      expect(messageIndicatesOptOut("Please don't STOP sending me information about your product")).toBe(false);
    });

    it("returns false for normal messages", () => {
      expect(messageIndicatesOptOut("Thanks for the info")).toBe(false);
      expect(messageIndicatesOptOut("I'd like to learn more")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(messageIndicatesOptOut("")).toBe(false);
    });
  });
});
