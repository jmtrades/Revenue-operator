import { describe, it, expect } from "vitest";
import { getUsageAlertLevel, PLAN_LIMITS } from "@/lib/billing/overage";

describe("billing overage", () => {
  describe("getUsageAlertLevel", () => {
    it("returns normal for 0%", () => {
      expect(getUsageAlertLevel(0)).toBe("normal");
    });

    it("returns normal for 50%", () => {
      expect(getUsageAlertLevel(50)).toBe("normal");
    });

    it("returns warning for 51%", () => {
      expect(getUsageAlertLevel(51)).toBe("warning");
    });

    it("returns warning for 90%", () => {
      expect(getUsageAlertLevel(90)).toBe("warning");
    });

    it("returns critical for 91%", () => {
      expect(getUsageAlertLevel(91)).toBe("critical");
    });

    it("returns critical for 100%", () => {
      expect(getUsageAlertLevel(100)).toBe("critical");
    });

    it("returns exceeded for 101%", () => {
      expect(getUsageAlertLevel(101)).toBe("exceeded");
    });

    it("returns exceeded for 200%", () => {
      expect(getUsageAlertLevel(200)).toBe("exceeded");
    });
  });

  describe("PLAN_LIMITS", () => {
    it("has all four plan tiers", () => {
      expect(PLAN_LIMITS).toHaveProperty("solo");
      expect(PLAN_LIMITS).toHaveProperty("business");
      expect(PLAN_LIMITS).toHaveProperty("scale");
      expect(PLAN_LIMITS).toHaveProperty("enterprise");
    });

    it("each tier has required fields", () => {
      for (const tier of ["solo", "business", "scale", "enterprise"] as const) {
        const limits = PLAN_LIMITS[tier];
        expect(limits.minutes).toBeGreaterThan(0);
        expect(typeof limits.sms).toBe("number");
        expect(limits.overage_cents_per_minute).toBeGreaterThanOrEqual(0);
        expect(limits.sms_overage_cents).toBeGreaterThanOrEqual(0);
      }
    });

    it("higher tiers have more minutes", () => {
      expect(PLAN_LIMITS.business.minutes).toBeGreaterThanOrEqual(PLAN_LIMITS.solo.minutes);
      expect(PLAN_LIMITS.scale.minutes).toBeGreaterThanOrEqual(PLAN_LIMITS.business.minutes);
      expect(PLAN_LIMITS.enterprise.minutes).toBeGreaterThanOrEqual(PLAN_LIMITS.scale.minutes);
    });
  });
});
