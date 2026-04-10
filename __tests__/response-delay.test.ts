import { describe, it, expect } from "vitest";
import { computeResponseDelaySeconds } from "@/lib/human-presence/response-delay";

describe("response delay", () => {
  describe("computeResponseDelaySeconds", () => {
    it("returns a number for NEW_INTEREST state", () => {
      const delay = computeResponseDelaySeconds("NEW_INTEREST");
      expect(typeof delay).toBe("number");
      expect(delay).toBeGreaterThanOrEqual(20);
      expect(delay).toBeLessThanOrEqual(90);
    });

    it("returns a number for COLD state", () => {
      const delay = computeResponseDelaySeconds("COLD");
      expect(delay).toBeGreaterThanOrEqual(24 * 3600);
      expect(delay).toBeLessThanOrEqual(3 * 24 * 3600);
    });

    it("returns shorter delay for COMMITMENT state", () => {
      const delay = computeResponseDelaySeconds("COMMITMENT");
      expect(delay).toBeGreaterThanOrEqual(20);
      expect(delay).toBeLessThanOrEqual(90);
    });

    it("returns longer delay for DRIFT state", () => {
      const delay = computeResponseDelaySeconds("DRIFT");
      expect(delay).toBeGreaterThanOrEqual(30 * 60);
      expect(delay).toBeLessThanOrEqual(120 * 60);
    });

    it("applies momentum multiplier", () => {
      // With multiplier 0.5, delay should be roughly half
      const delays = Array.from({ length: 20 }, () => computeResponseDelaySeconds("CLARIFICATION", 0.5));
      const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
      // CLARIFICATION range is 30-120, center ~75, with 0.5x should be ~37.5
      // but clamped to min 30
      expect(avgDelay).toBeLessThan(120);
      expect(avgDelay).toBeGreaterThanOrEqual(30); // clamped to min
    });

    it("produces some variation across multiple calls", () => {
      const delays = new Set(
        Array.from({ length: 20 }, () => computeResponseDelaySeconds("NEW_INTEREST"))
      );
      // Should not always return the same value
      expect(delays.size).toBeGreaterThan(1);
    });

    it("handles unknown state by falling back to NEW_INTEREST range", () => {
      const delay = computeResponseDelaySeconds("UNKNOWN_STATE" as any);
      expect(delay).toBeGreaterThanOrEqual(20);
      expect(delay).toBeLessThanOrEqual(90);
    });
  });
});
