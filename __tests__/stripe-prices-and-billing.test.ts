/**
 * Stripe prices and billing plan integration tests.
 * Verifies billing-plans.ts structure and cross-references with PLAN_LIMITS.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import { BILLING_PLANS, BILLING_PLAN_ORDER, DEFAULT_PLAN, type PlanSlug } from "@/lib/billing-plans";
import { PLAN_LIMITS } from "@/lib/billing/overage";

const ALL_TIERS: PlanSlug[] = ["solo", "business", "scale", "enterprise"];

/* -------------------------------------------------------------------------- */
/*  billing-plans.ts existence and exports                                    */
/* -------------------------------------------------------------------------- */

describe("billing-plans.ts source file", () => {
  const filePath = resolve(__dirname, "../src/lib/billing-plans.ts");
  let src: string;

  it("exists and is readable", () => {
    src = readFileSync(filePath, "utf-8");
    expect(src.length).toBeGreaterThan(0);
  });

  it("exports BILLING_PLANS record", () => {
    src = src || readFileSync(filePath, "utf-8");
    expect(src).toContain("export const BILLING_PLANS");
  });

  it("exports PlanSlug type", () => {
    src = src || readFileSync(filePath, "utf-8");
    expect(src).toContain("export type PlanSlug");
  });

  it("exports normalizeTier function", () => {
    src = src || readFileSync(filePath, "utf-8");
    expect(src).toContain("export function normalizeTier");
  });

  it("exports USAGE_RATES", () => {
    src = src || readFileSync(filePath, "utf-8");
    expect(src).toContain("export const USAGE_RATES");
  });

  it("exports BillingPlan interface", () => {
    src = src || readFileSync(filePath, "utf-8");
    expect(src).toContain("export interface BillingPlan");
  });

  it("exports BILLING_PLAN_ORDER", () => {
    src = src || readFileSync(filePath, "utf-8");
    expect(src).toContain("export const BILLING_PLAN_ORDER");
  });

  it("exports DEFAULT_PLAN", () => {
    src = src || readFileSync(filePath, "utf-8");
    expect(src).toContain("export const DEFAULT_PLAN");
  });
});

/* -------------------------------------------------------------------------- */
/*  All plans have pricing info                                               */
/* -------------------------------------------------------------------------- */

describe("Plan pricing completeness", () => {
  it.each(ALL_TIERS)("%s has monthlyPrice and annualPrice", (tier) => {
    const plan = BILLING_PLANS[tier];
    expect(plan.monthlyPrice).toBeDefined();
    expect(plan.annualPrice).toBeDefined();
    expect(typeof plan.monthlyPrice).toBe("number");
    expect(typeof plan.annualPrice).toBe("number");
    expect(plan.monthlyPrice).toBeGreaterThan(0);
    expect(plan.annualPrice).toBeGreaterThan(0);
  });

  it.each(ALL_TIERS)("%s has includedMinutes", (tier) => {
    expect(BILLING_PLANS[tier].includedMinutes).toBeGreaterThan(0);
  });

  it.each(ALL_TIERS)("%s has overageRateCents defined", (tier) => {
    expect(typeof BILLING_PLANS[tier].overageRateCents).toBe("number");
    expect(BILLING_PLANS[tier].overageRateCents).toBeGreaterThanOrEqual(0);
  });

  it.each(ALL_TIERS)("%s has smsOverageRateCents defined", (tier) => {
    expect(typeof BILLING_PLANS[tier].smsOverageRateCents).toBe("number");
    expect(BILLING_PLANS[tier].smsOverageRateCents).toBeGreaterThanOrEqual(0);
  });

  it.each(ALL_TIERS)("%s has resource limits defined", (tier) => {
    const plan = BILLING_PLANS[tier];
    expect(typeof plan.maxAgents).toBe("number");
    expect(typeof plan.maxSeats).toBe("number");
    expect(typeof plan.maxPhoneNumbers).toBe("number");
    expect(typeof plan.outboundDailyLimit).toBe("number");
    expect(typeof plan.smsMonthlyCap).toBe("number");
  });

  it("pricing increases with tier level", () => {
    expect(BILLING_PLANS.business.monthlyPrice).toBeGreaterThan(BILLING_PLANS.solo.monthlyPrice);
    expect(BILLING_PLANS.scale.monthlyPrice).toBeGreaterThan(BILLING_PLANS.business.monthlyPrice);
    expect(BILLING_PLANS.enterprise.monthlyPrice).toBeGreaterThan(BILLING_PLANS.scale.monthlyPrice);
  });

  it("annual pricing is always less than 12x monthly (annual discount)", () => {
    for (const tier of ALL_TIERS) {
      const plan = BILLING_PLANS[tier];
      expect(plan.annualPrice).toBeLessThan(plan.monthlyPrice * 12);
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  Cross-reference: BILLING_PLANS <-> PLAN_LIMITS                            */
/* -------------------------------------------------------------------------- */

describe("Plan tier consistency between billing-plans.ts and overage.ts", () => {
  it("all BILLING_PLANS tiers exist in PLAN_LIMITS", () => {
    for (const tier of ALL_TIERS) {
      expect(PLAN_LIMITS).toHaveProperty(tier);
    }
  });

  it("all PLAN_LIMITS tiers exist in BILLING_PLANS", () => {
    for (const tier of Object.keys(PLAN_LIMITS) as PlanSlug[]) {
      expect(BILLING_PLANS).toHaveProperty(tier);
    }
  });

  it("PLAN_LIMITS tier set exactly matches BILLING_PLANS tier set", () => {
    const planLimitTiers = Object.keys(PLAN_LIMITS).sort();
    const billingPlanTiers = Object.keys(BILLING_PLANS).sort();
    expect(planLimitTiers).toEqual(billingPlanTiers);
  });

  it.each(ALL_TIERS)("%s: PLAN_LIMITS.minutes matches BILLING_PLANS.includedMinutes", (tier) => {
    expect(PLAN_LIMITS[tier].minutes).toBe(BILLING_PLANS[tier].includedMinutes);
  });

  it.each(ALL_TIERS)("%s: PLAN_LIMITS.sms matches BILLING_PLANS.smsMonthlyCap", (tier) => {
    expect(PLAN_LIMITS[tier].sms).toBe(BILLING_PLANS[tier].smsMonthlyCap);
  });

  it.each(ALL_TIERS)("%s: overage_cents_per_minute matches overageRateCents", (tier) => {
    expect(PLAN_LIMITS[tier].overage_cents_per_minute).toBe(BILLING_PLANS[tier].overageRateCents);
  });

  it.each(ALL_TIERS)("%s: sms_overage_cents matches smsOverageRateCents", (tier) => {
    expect(PLAN_LIMITS[tier].sms_overage_cents).toBe(BILLING_PLANS[tier].smsOverageRateCents);
  });
});

/* -------------------------------------------------------------------------- */
/*  BILLING_PLAN_ORDER and DEFAULT_PLAN                                       */
/* -------------------------------------------------------------------------- */

describe("BILLING_PLAN_ORDER and DEFAULT_PLAN", () => {
  it("BILLING_PLAN_ORDER contains paid tiers in ascending order", () => {
    expect(BILLING_PLAN_ORDER).toEqual(["solo", "business", "scale"]);
  });

  it("BILLING_PLAN_ORDER excludes enterprise (custom pricing)", () => {
    expect(BILLING_PLAN_ORDER).not.toContain("enterprise");
  });

  it("all BILLING_PLAN_ORDER entries are valid BILLING_PLANS keys", () => {
    for (const tier of BILLING_PLAN_ORDER) {
      expect(BILLING_PLANS).toHaveProperty(tier);
    }
  });

  it("DEFAULT_PLAN is a valid plan slug", () => {
    expect(ALL_TIERS).toContain(DEFAULT_PLAN);
  });

  it("DEFAULT_PLAN is business", () => {
    expect(DEFAULT_PLAN).toBe("business");
  });
});

/* -------------------------------------------------------------------------- */
/*  Resource limits consistency                                               */
/* -------------------------------------------------------------------------- */

describe("Resource limits increase (or go unlimited) with tier", () => {
  it("maxAgents increases with tier (or becomes unlimited at -1)", () => {
    expect(BILLING_PLANS.business.maxAgents).toBeGreaterThan(BILLING_PLANS.solo.maxAgents);
    expect(BILLING_PLANS.scale.maxAgents).toBeGreaterThan(BILLING_PLANS.business.maxAgents);
    // enterprise is unlimited (-1)
    expect(BILLING_PLANS.enterprise.maxAgents).toBe(-1);
  });

  it("maxPhoneNumbers increases with tier (or becomes unlimited at -1)", () => {
    expect(BILLING_PLANS.business.maxPhoneNumbers).toBeGreaterThan(BILLING_PLANS.solo.maxPhoneNumbers);
    expect(BILLING_PLANS.scale.maxPhoneNumbers).toBeGreaterThan(BILLING_PLANS.business.maxPhoneNumbers);
    expect(BILLING_PLANS.enterprise.maxPhoneNumbers).toBe(-1);
  });

  it("outboundDailyLimit increases with tier (or becomes unlimited at -1)", () => {
    expect(BILLING_PLANS.business.outboundDailyLimit).toBeGreaterThan(BILLING_PLANS.solo.outboundDailyLimit);
    expect(BILLING_PLANS.scale.outboundDailyLimit).toBeGreaterThan(BILLING_PLANS.business.outboundDailyLimit);
    expect(BILLING_PLANS.enterprise.outboundDailyLimit).toBe(-1);
  });

  it("smsMonthlyCap increases with tier (or becomes unlimited at -1)", () => {
    expect(BILLING_PLANS.business.smsMonthlyCap).toBeGreaterThan(BILLING_PLANS.solo.smsMonthlyCap);
    expect(BILLING_PLANS.scale.smsMonthlyCap).toBeGreaterThan(BILLING_PLANS.business.smsMonthlyCap);
    expect(BILLING_PLANS.enterprise.smsMonthlyCap).toBe(-1);
  });

  it("includedMinutes increases with tier", () => {
    expect(BILLING_PLANS.business.includedMinutes).toBeGreaterThan(BILLING_PLANS.solo.includedMinutes);
    expect(BILLING_PLANS.scale.includedMinutes).toBeGreaterThan(BILLING_PLANS.business.includedMinutes);
    expect(BILLING_PLANS.enterprise.includedMinutes).toBeGreaterThan(BILLING_PLANS.scale.includedMinutes);
  });
});
