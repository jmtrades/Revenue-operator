/**
 * Tests for billing plan structure, normalization helpers, and overage rate configuration.
 * Source: src/lib/billing-plans.ts, src/lib/billing/overage.ts
 */

import { describe, it, expect } from "vitest";
import {
  BILLING_PLANS,
  type PlanSlug,
  type BillingPlan,
  normalizeTier,
  planIdFromBillingTier,
  planSlugFromUiPlanId,
  PLAN_DISPLAY_NAMES,
  USAGE_RATES,
  BILLING_PLAN_ORDER,
  DEFAULT_PLAN,
} from "@/lib/billing-plans";
import { PLAN_LIMITS, getUsageAlertLevel } from "@/lib/billing/overage";

/* ------------------------------------------------------------------ */
/*  BILLING_PLANS: structure & completeness                           */
/* ------------------------------------------------------------------ */

describe("BILLING_PLANS", () => {
  const ALL_TIERS: PlanSlug[] = ["solo", "business", "scale", "enterprise"];

  it("exports all 4 tiers", () => {
    const keys = Object.keys(BILLING_PLANS);
    expect(keys).toHaveLength(4);
    for (const tier of ALL_TIERS) {
      expect(BILLING_PLANS).toHaveProperty(tier);
    }
  });

  describe.each(ALL_TIERS)("plan: %s", (tier) => {
    const plan: BillingPlan = BILLING_PLANS[tier];

    it("has all required scalar fields", () => {
      expect(typeof plan.slug).toBe("string");
      expect(plan.slug).toBe(tier);
      expect(typeof plan.label).toBe("string");
      expect(plan.label.length).toBeGreaterThan(0);
      expect(typeof plan.description).toBe("string");
      expect(typeof plan.monthlyPrice).toBe("number");
      expect(typeof plan.annualPrice).toBe("number");
      expect(typeof plan.includedMinutes).toBe("number");
      expect(typeof plan.overageRateCents).toBe("number");
      expect(typeof plan.smsOverageRateCents).toBe("number");
      expect(typeof plan.maxAgents).toBe("number");
      expect(typeof plan.maxSeats).toBe("number");
      expect(typeof plan.maxPhoneNumbers).toBe("number");
      expect(typeof plan.outboundDailyLimit).toBe("number");
      expect(typeof plan.smsMonthlyCap).toBe("number");
      expect(typeof plan.includedPhoneNumbers).toBe("number");
    });

    it("has a features object with all expected boolean flags", () => {
      const expectedFeatures = [
        "appointmentBooking",
        "missedCallRecovery",
        "noShowRecovery",
        "reactivationCampaigns",
        "outboundCampaigns",
        "outboundPowerDialer",
        "industryTemplates",
        "smsEmail",
        "voiceFollowUp",
        "revenueAnalytics",
        "advancedAnalytics",
        "crmWebhook",
        "nativeCrmSync",
        "apiAccess",
        "premiumVoices",
        "prioritySupport",
        "whiteLabel",
        "sso",
      ] as const;

      expect(plan.features).toBeDefined();
      for (const key of expectedFeatures) {
        expect(typeof plan.features[key]).toBe("boolean");
      }
    });

    it("has positive includedMinutes", () => {
      expect(plan.includedMinutes).toBeGreaterThan(0);
    });

    it("has non-negative overage rates", () => {
      expect(plan.overageRateCents).toBeGreaterThanOrEqual(0);
      expect(plan.smsOverageRateCents).toBeGreaterThanOrEqual(0);
    });

    it("has a positive monthly price", () => {
      expect(plan.monthlyPrice).toBeGreaterThan(0);
    });

    it("annual price offers a discount vs 12x monthly", () => {
      expect(plan.annualPrice).toBeLessThan(plan.monthlyPrice * 12);
    });
  });

  it("monthly prices increase from solo to enterprise", () => {
    expect(BILLING_PLANS.solo.monthlyPrice).toBeLessThan(BILLING_PLANS.business.monthlyPrice);
    expect(BILLING_PLANS.business.monthlyPrice).toBeLessThan(BILLING_PLANS.scale.monthlyPrice);
    expect(BILLING_PLANS.scale.monthlyPrice).toBeLessThan(BILLING_PLANS.enterprise.monthlyPrice);
  });

  it("included minutes increase from solo to enterprise", () => {
    expect(BILLING_PLANS.solo.includedMinutes).toBeLessThan(BILLING_PLANS.business.includedMinutes);
    expect(BILLING_PLANS.business.includedMinutes).toBeLessThan(BILLING_PLANS.scale.includedMinutes);
    expect(BILLING_PLANS.scale.includedMinutes).toBeLessThan(BILLING_PLANS.enterprise.includedMinutes);
  });

  it("maxAgents increase from solo to scale", () => {
    expect(BILLING_PLANS.solo.maxAgents).toBeLessThan(BILLING_PLANS.business.maxAgents);
    expect(BILLING_PLANS.business.maxAgents).toBeLessThan(BILLING_PLANS.scale.maxAgents);
  });

  it("enterprise has unlimited agents (maxAgents === -1)", () => {
    expect(BILLING_PLANS.enterprise.maxAgents).toBe(-1);
  });

  it("enterprise has unlimited seats (maxSeats === -1)", () => {
    expect(BILLING_PLANS.enterprise.maxSeats).toBe(-1);
  });

  it("enterprise has unlimited phone numbers (maxPhoneNumbers === -1)", () => {
    expect(BILLING_PLANS.enterprise.maxPhoneNumbers).toBe(-1);
  });

  it("enterprise has zero overage rates (included unlimited)", () => {
    expect(BILLING_PLANS.enterprise.overageRateCents).toBe(0);
    expect(BILLING_PLANS.enterprise.smsOverageRateCents).toBe(0);
  });

  it("enterprise enables all feature flags", () => {
    const features = BILLING_PLANS.enterprise.features;
    for (const [key, value] of Object.entries(features)) {
      expect(value, `enterprise.features.${key} should be true`).toBe(true);
    }
  });

  it("solo has the most restricted feature set", () => {
    const solo = BILLING_PLANS.solo.features;
    // solo should NOT have whiteLabel, sso, advancedAnalytics, etc.
    expect(solo.whiteLabel).toBe(false);
    expect(solo.sso).toBe(false);
    expect(solo.advancedAnalytics).toBe(false);
    expect(solo.outboundCampaigns).toBe(false);
    // but should have basic features
    expect(solo.appointmentBooking).toBe(true);
    expect(solo.missedCallRecovery).toBe(true);
    expect(solo.smsEmail).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  normalizeTier                                                      */
/* ------------------------------------------------------------------ */

describe("normalizeTier", () => {
  it("maps standard tier names to themselves", () => {
    expect(normalizeTier("solo")).toBe("solo");
    expect(normalizeTier("business")).toBe("business");
    expect(normalizeTier("scale")).toBe("scale");
    expect(normalizeTier("enterprise")).toBe("enterprise");
  });

  it("maps legacy tier names to current slugs", () => {
    expect(normalizeTier("starter")).toBe("solo");
    expect(normalizeTier("growth")).toBe("business");
    expect(normalizeTier("team")).toBe("scale");
    expect(normalizeTier("agency")).toBe("enterprise");
  });

  it("defaults to solo for null/undefined", () => {
    expect(normalizeTier(null)).toBe("solo");
    expect(normalizeTier(undefined)).toBe("solo");
  });

  it("defaults to solo for unknown tier names", () => {
    expect(normalizeTier("nonexistent")).toBe("solo");
    expect(normalizeTier("premium")).toBe("solo");
  });

  it("is case-insensitive", () => {
    expect(normalizeTier("SOLO")).toBe("solo");
    expect(normalizeTier("Business")).toBe("business");
    expect(normalizeTier("ENTERPRISE")).toBe("enterprise");
  });
});

/* ------------------------------------------------------------------ */
/*  planIdFromBillingTier                                              */
/* ------------------------------------------------------------------ */

describe("planIdFromBillingTier", () => {
  it("maps DB tiers to UI plan IDs", () => {
    expect(planIdFromBillingTier("solo")).toBe("starter");
    expect(planIdFromBillingTier("business")).toBe("growth");
    expect(planIdFromBillingTier("scale")).toBe("scale");
    expect(planIdFromBillingTier("enterprise")).toBe("enterprise");
  });

  it("maps legacy DB tiers via normalizeTier", () => {
    expect(planIdFromBillingTier("starter")).toBe("starter");
    expect(planIdFromBillingTier("growth")).toBe("growth");
    expect(planIdFromBillingTier("team")).toBe("scale");
    expect(planIdFromBillingTier("agency")).toBe("enterprise");
  });

  it("defaults to starter for null/undefined", () => {
    expect(planIdFromBillingTier(null)).toBe("starter");
    expect(planIdFromBillingTier(undefined)).toBe("starter");
  });
});

/* ------------------------------------------------------------------ */
/*  planSlugFromUiPlanId                                               */
/* ------------------------------------------------------------------ */

describe("planSlugFromUiPlanId", () => {
  it("maps UI plan IDs back to PlanSlug", () => {
    expect(planSlugFromUiPlanId("starter")).toBe("solo");
    expect(planSlugFromUiPlanId("growth")).toBe("business");
    expect(planSlugFromUiPlanId("scale")).toBe("scale");
    expect(planSlugFromUiPlanId("enterprise")).toBe("enterprise");
  });
});

/* ------------------------------------------------------------------ */
/*  PLAN_DISPLAY_NAMES                                                 */
/* ------------------------------------------------------------------ */

describe("PLAN_DISPLAY_NAMES", () => {
  it("has a display name for every tier", () => {
    expect(PLAN_DISPLAY_NAMES.solo).toBe("Starter");
    expect(PLAN_DISPLAY_NAMES.business).toBe("Growth");
    expect(PLAN_DISPLAY_NAMES.scale).toBe("Business");
    expect(PLAN_DISPLAY_NAMES.enterprise).toBe("Agency");
  });
});

/* ------------------------------------------------------------------ */
/*  USAGE_RATES                                                        */
/* ------------------------------------------------------------------ */

describe("USAGE_RATES", () => {
  it("has SMS overage rates per tier that decrease as tier increases", () => {
    const rates = USAGE_RATES.smsOverageCentsPerSegment;
    expect(rates.solo).toBeGreaterThan(rates.business);
    expect(rates.business).toBeGreaterThan(rates.scale);
    expect(rates.scale).toBeGreaterThan(rates.enterprise);
    expect(rates.enterprise).toBe(0);
  });

  it("has positive phone number monthly cost", () => {
    expect(USAGE_RATES.phoneNumberMonthlyCents).toBeGreaterThan(0);
  });

  it("has positive extra agent monthly cost", () => {
    expect(USAGE_RATES.extraAgentMonthlyCents).toBeGreaterThan(0);
  });

  it("has positive extra seat monthly cost", () => {
    expect(USAGE_RATES.extraSeatMonthlyCents).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  BILLING_PLAN_ORDER & DEFAULT_PLAN                                  */
/* ------------------------------------------------------------------ */

describe("BILLING_PLAN_ORDER", () => {
  it("lists the three paid tiers in ascending order (excludes enterprise)", () => {
    expect(BILLING_PLAN_ORDER).toEqual(["solo", "business", "scale"]);
  });
});

describe("DEFAULT_PLAN", () => {
  it("defaults to business", () => {
    expect(DEFAULT_PLAN).toBe("business");
  });
});

/* ------------------------------------------------------------------ */
/*  PLAN_LIMITS (from overage.ts)                                      */
/* ------------------------------------------------------------------ */

describe("PLAN_LIMITS", () => {
  const ALL_TIERS: PlanSlug[] = ["solo", "business", "scale", "enterprise"];

  it("has an entry for every tier", () => {
    for (const tier of ALL_TIERS) {
      expect(PLAN_LIMITS).toHaveProperty(tier);
    }
  });

  it("derives minutes from BILLING_PLANS", () => {
    for (const tier of ALL_TIERS) {
      expect(PLAN_LIMITS[tier].minutes).toBe(BILLING_PLANS[tier].includedMinutes);
    }
  });

  it("derives SMS cap from BILLING_PLANS", () => {
    for (const tier of ALL_TIERS) {
      expect(PLAN_LIMITS[tier].sms).toBe(BILLING_PLANS[tier].smsMonthlyCap);
    }
  });

  it("derives overage rates from BILLING_PLANS", () => {
    for (const tier of ALL_TIERS) {
      expect(PLAN_LIMITS[tier].overage_cents_per_minute).toBe(BILLING_PLANS[tier].overageRateCents);
      expect(PLAN_LIMITS[tier].sms_overage_cents).toBe(BILLING_PLANS[tier].smsOverageRateCents);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  getUsageAlertLevel (pure function from overage.ts)                 */
/* ------------------------------------------------------------------ */

describe("getUsageAlertLevel", () => {
  it('returns "normal" for usage at or below 50%', () => {
    expect(getUsageAlertLevel(0)).toBe("normal");
    expect(getUsageAlertLevel(25)).toBe("normal");
    expect(getUsageAlertLevel(50)).toBe("normal");
  });

  it('returns "warning" for usage between 50% and 90%', () => {
    expect(getUsageAlertLevel(51)).toBe("warning");
    expect(getUsageAlertLevel(75)).toBe("warning");
    expect(getUsageAlertLevel(90)).toBe("warning");
  });

  it('returns "critical" for usage between 90% and 100%', () => {
    expect(getUsageAlertLevel(91)).toBe("critical");
    expect(getUsageAlertLevel(99)).toBe("critical");
    expect(getUsageAlertLevel(100)).toBe("critical");
  });

  it('returns "exceeded" for usage above 100%', () => {
    expect(getUsageAlertLevel(101)).toBe("exceeded");
    expect(getUsageAlertLevel(200)).toBe("exceeded");
  });
});
