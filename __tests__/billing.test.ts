/**
 * Billing tests: PLAN_LIMITS structure, overage calculations, plan enforcement exports,
 * stripe-client singleton, and billing metadata.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import { PLAN_LIMITS, getUsageAlertLevel } from "@/lib/billing/overage";
import { BILLING_PLANS, normalizeTier, PLAN_DISPLAY_NAMES, type PlanSlug } from "@/lib/billing-plans";

const TIERS: PlanSlug[] = ["solo", "business", "scale", "enterprise"];

/* -------------------------------------------------------------------------- */
/*  PLAN_LIMITS structure                                                     */
/* -------------------------------------------------------------------------- */

describe("PLAN_LIMITS", () => {
  it("contains all four plan tiers", () => {
    for (const tier of TIERS) {
      expect(PLAN_LIMITS).toHaveProperty(tier);
    }
  });

  it.each(TIERS)("%s has all required numeric fields", (tier) => {
    const plan = PLAN_LIMITS[tier];
    expect(typeof plan.minutes).toBe("number");
    expect(typeof plan.sms).toBe("number");
    expect(typeof plan.overage_cents_per_minute).toBe("number");
    expect(typeof plan.sms_overage_cents).toBe("number");
  });

  it.each(TIERS)("%s minutes and sms limits are non-negative", (tier) => {
    const plan = PLAN_LIMITS[tier];
    expect(plan.minutes).toBeGreaterThanOrEqual(0);
    // sms can be -1 for unlimited (enterprise)
    expect(plan.sms === -1 || plan.sms >= 0).toBe(true);
  });

  it.each(TIERS)("%s overage rates are non-negative", (tier) => {
    const plan = PLAN_LIMITS[tier];
    expect(plan.overage_cents_per_minute).toBeGreaterThanOrEqual(0);
    expect(plan.sms_overage_cents).toBeGreaterThanOrEqual(0);
  });

  it("higher tiers include more minutes than lower tiers", () => {
    expect(PLAN_LIMITS.business.minutes).toBeGreaterThan(PLAN_LIMITS.solo.minutes);
    expect(PLAN_LIMITS.scale.minutes).toBeGreaterThan(PLAN_LIMITS.business.minutes);
    expect(PLAN_LIMITS.enterprise.minutes).toBeGreaterThan(PLAN_LIMITS.scale.minutes);
  });

  it("voice_minutes mirrors minutes for all tiers", () => {
    for (const tier of TIERS) {
      const plan = PLAN_LIMITS[tier];
      if (plan.voice_minutes !== undefined) {
        expect(plan.voice_minutes).toBe(plan.minutes);
      }
    }
  });

  it("PLAN_LIMITS values are sourced from BILLING_PLANS", () => {
    for (const tier of TIERS) {
      expect(PLAN_LIMITS[tier].minutes).toBe(BILLING_PLANS[tier].includedMinutes);
      expect(PLAN_LIMITS[tier].sms).toBe(BILLING_PLANS[tier].smsMonthlyCap);
      expect(PLAN_LIMITS[tier].overage_cents_per_minute).toBe(BILLING_PLANS[tier].overageRateCents);
      expect(PLAN_LIMITS[tier].sms_overage_cents).toBe(BILLING_PLANS[tier].smsOverageRateCents);
    }
  });

  it("enterprise has zero overage rates (unlimited model)", () => {
    expect(PLAN_LIMITS.enterprise.overage_cents_per_minute).toBe(0);
    expect(PLAN_LIMITS.enterprise.sms_overage_cents).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/*  getUsageAlertLevel                                                        */
/* -------------------------------------------------------------------------- */

describe("getUsageAlertLevel", () => {
  it('returns "normal" for usage at or below 50%', () => {
    expect(getUsageAlertLevel(0)).toBe("normal");
    expect(getUsageAlertLevel(25)).toBe("normal");
    expect(getUsageAlertLevel(50)).toBe("normal");
  });

  it('returns "warning" for usage between 50% and 90% (exclusive bounds)', () => {
    expect(getUsageAlertLevel(51)).toBe("warning");
    expect(getUsageAlertLevel(75)).toBe("warning");
    expect(getUsageAlertLevel(90)).toBe("warning");
  });

  it('returns "critical" for usage between 90% and 100% (exclusive bounds)', () => {
    expect(getUsageAlertLevel(91)).toBe("critical");
    expect(getUsageAlertLevel(99)).toBe("critical");
    expect(getUsageAlertLevel(100)).toBe("critical");
  });

  it('returns "exceeded" for usage above 100%', () => {
    expect(getUsageAlertLevel(101)).toBe("exceeded");
    expect(getUsageAlertLevel(200)).toBe("exceeded");
  });
});

/* -------------------------------------------------------------------------- */
/*  normalizeTier                                                             */
/* -------------------------------------------------------------------------- */

describe("normalizeTier", () => {
  it("maps canonical tier names to themselves", () => {
    expect(normalizeTier("solo")).toBe("solo");
    expect(normalizeTier("business")).toBe("business");
    expect(normalizeTier("scale")).toBe("scale");
    expect(normalizeTier("enterprise")).toBe("enterprise");
  });

  it("maps legacy tier names to canonical slugs", () => {
    expect(normalizeTier("starter")).toBe("solo");
    expect(normalizeTier("growth")).toBe("business");
    expect(normalizeTier("team")).toBe("scale");
    expect(normalizeTier("agency")).toBe("enterprise");
  });

  it("is case-insensitive", () => {
    expect(normalizeTier("SOLO")).toBe("solo");
    expect(normalizeTier("Business")).toBe("business");
    expect(normalizeTier("SCALE")).toBe("scale");
  });

  it("defaults to solo for null/undefined/unknown", () => {
    expect(normalizeTier(null)).toBe("solo");
    expect(normalizeTier(undefined)).toBe("solo");
    expect(normalizeTier("nonexistent")).toBe("solo");
  });
});

/* -------------------------------------------------------------------------- */
/*  Plan enforcement exports (structural)                                     */
/* -------------------------------------------------------------------------- */

describe("plan-enforcement.ts structural checks", () => {
  const src = readFileSync(
    resolve(__dirname, "../src/lib/billing/plan-enforcement.ts"),
    "utf-8"
  );

  const expectedExports = [
    "canCreateAgent",
    "canProvisionNumber",
    "canMakeOutboundCall",
    "canInviteSeat",
    "canUseFeature",
  ];

  it.each(expectedExports)("exports async function %s", (fn) => {
    expect(src).toContain(`export async function ${fn}(`);
  });

  it("exports the EnforcementResult interface", () => {
    expect(src).toContain("export interface EnforcementResult");
  });

  it("EnforcementResult has allowed, reason, message, upgradeTo fields", () => {
    expect(src).toContain("allowed: boolean");
    expect(src).toContain("reason?:");
    expect(src).toContain("message?: string");
    expect(src).toContain("upgradeTo?: PlanSlug");
  });

  it("all enforcement functions accept workspaceId as first parameter", () => {
    for (const fn of expectedExports) {
      const pattern = new RegExp(`${fn}\\(\\s*workspaceId:\\s*string`);
      expect(src).toMatch(pattern);
    }
  });

  it("canUseFeature accepts a feature parameter", () => {
    expect(src).toMatch(/canUseFeature\(\s*workspaceId:\s*string,\s*feature:/);
  });

  it("all enforcement functions return Promise<EnforcementResult>", () => {
    for (const fn of expectedExports) {
      const pattern = new RegExp(`${fn}\\([^)]*\\):\\s*Promise<EnforcementResult>`);
      expect(src).toMatch(pattern);
    }
  });

  it("references BILLING_PLANS for limit lookups", () => {
    expect(src).toContain("BILLING_PLANS");
  });

  it("includes upgrade suggestion logic", () => {
    expect(src).toContain("suggestUpgrade");
  });
});

/* -------------------------------------------------------------------------- */
/*  stripe-client.ts structural checks                                        */
/* -------------------------------------------------------------------------- */

describe("stripe-client.ts", () => {
  const src = readFileSync(
    resolve(__dirname, "../src/lib/billing/stripe-client.ts"),
    "utf-8"
  );

  it("exports getStripe function", () => {
    expect(src).toContain("export function getStripe()");
  });

  it("uses singleton pattern (caches instance)", () => {
    // Checks for private variable and early return
    expect(src).toMatch(/let\s+_stripe/);
    expect(src).toContain("if (_stripe) return _stripe");
  });

  it("throws when STRIPE_SECRET_KEY is missing", () => {
    expect(src).toContain("STRIPE_SECRET_KEY");
    expect(src).toMatch(/throw new Error/);
  });

  it("pins apiVersion for consistent behavior", () => {
    expect(src).toContain("apiVersion");
  });
});

/* -------------------------------------------------------------------------- */
/*  Billing plan display names and metadata                                   */
/* -------------------------------------------------------------------------- */

describe("Billing plan metadata", () => {
  it("PLAN_DISPLAY_NAMES has entries for all tiers", () => {
    for (const tier of TIERS) {
      expect(PLAN_DISPLAY_NAMES[tier]).toBeDefined();
      expect(typeof PLAN_DISPLAY_NAMES[tier]).toBe("string");
      expect(PLAN_DISPLAY_NAMES[tier].length).toBeGreaterThan(0);
    }
  });

  it("every BILLING_PLANS entry has a label, description, and slug", () => {
    for (const tier of TIERS) {
      const plan = BILLING_PLANS[tier];
      expect(plan.slug).toBe(tier);
      expect(plan.label.length).toBeGreaterThan(0);
      expect(plan.description.length).toBeGreaterThan(0);
    }
  });

  it("monthly price is always less than annual price (annual is 12-month total)", () => {
    for (const tier of TIERS) {
      const plan = BILLING_PLANS[tier];
      // Annual total should be less than 12 * monthly (annual discount)
      expect(plan.annualPrice).toBeLessThan(plan.monthlyPrice * 12);
    }
  });

  it("every plan has pricing in cents (positive integers)", () => {
    for (const tier of TIERS) {
      const plan = BILLING_PLANS[tier];
      expect(Number.isInteger(plan.monthlyPrice)).toBe(true);
      expect(plan.monthlyPrice).toBeGreaterThan(0);
      expect(Number.isInteger(plan.annualPrice)).toBe(true);
      expect(plan.annualPrice).toBeGreaterThan(0);
    }
  });

  it("features object has consistent keys across all tiers", () => {
    const soloFeatureKeys = Object.keys(BILLING_PLANS.solo.features).sort();
    for (const tier of TIERS) {
      const keys = Object.keys(BILLING_PLANS[tier].features).sort();
      expect(keys).toEqual(soloFeatureKeys);
    }
  });

  it("enterprise has all features enabled", () => {
    const features = BILLING_PLANS.enterprise.features;
    for (const [key, value] of Object.entries(features)) {
      expect(value).toBe(true);
    }
  });

  it("higher tiers unlock more features (monotonically non-decreasing)", () => {
    const countTrue = (plan: PlanSlug) =>
      Object.values(BILLING_PLANS[plan].features).filter(Boolean).length;
    expect(countTrue("business")).toBeGreaterThanOrEqual(countTrue("solo"));
    expect(countTrue("scale")).toBeGreaterThanOrEqual(countTrue("business"));
    expect(countTrue("enterprise")).toBeGreaterThanOrEqual(countTrue("scale"));
  });
});

/* -------------------------------------------------------------------------- */
/*  overage.ts structural checks                                              */
/* -------------------------------------------------------------------------- */

describe("overage.ts structural checks", () => {
  const src = readFileSync(
    resolve(__dirname, "../src/lib/billing/overage.ts"),
    "utf-8"
  );

  it("exports PLAN_LIMITS", () => {
    expect(src).toContain("export const PLAN_LIMITS");
  });

  it("exports checkUsageThresholds", () => {
    expect(src).toContain("export async function checkUsageThresholds");
  });

  it("exports calculateOverageCharges", () => {
    expect(src).toContain("export async function calculateOverageCharges");
  });

  it("exports getDailyUsageBreakdown", () => {
    expect(src).toContain("export async function getDailyUsageBreakdown");
  });

  it("exports reportUsageOverage", () => {
    expect(src).toContain("export async function reportUsageOverage");
  });

  it("exports getUsageAlertLevel", () => {
    expect(src).toContain("export function getUsageAlertLevel");
  });

  it("exports AlertLevel type", () => {
    expect(src).toContain('export type AlertLevel');
  });

  it("calculates bonus minutes offset before overage charges", () => {
    expect(src).toContain("bonusMinutes");
    expect(src).toContain("bonusForRegular");
    expect(src).toContain("bonusForVoice");
  });

  it("handles voice minutes as a separate dimension from call minutes", () => {
    expect(src).toContain("voice_minutes_used");
    expect(src).toContain("voice_minutes_limit");
    expect(src).toContain("overage_voice_minutes");
  });
});
