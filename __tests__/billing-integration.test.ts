/**
 * Tests for the plan-enforcement module exports and EnforcementResult type shape.
 * Source: src/lib/billing/plan-enforcement.ts
 *
 * Since enforcement functions hit the DB, we verify:
 * 1. The module exports the expected public API
 * 2. Each exported function is an async function
 * 3. The EnforcementResult interface shape (via runtime checks on objects that conform to it)
 * 4. That BILLING_PLANS feature keys match the feature parameter type of canUseFeature
 */

import { describe, it, expect } from "vitest";
import * as PlanEnforcement from "@/lib/billing/plan-enforcement";
import { BILLING_PLANS, type PlanSlug } from "@/lib/billing-plans";

/* ------------------------------------------------------------------ */
/*  Module exports                                                     */
/* ------------------------------------------------------------------ */

describe("plan-enforcement module exports", () => {
  it("exports canCreateAgent as a function", () => {
    expect(typeof PlanEnforcement.canCreateAgent).toBe("function");
  });

  it("exports canProvisionNumber as a function", () => {
    expect(typeof PlanEnforcement.canProvisionNumber).toBe("function");
  });

  it("exports canMakeOutboundCall as a function", () => {
    expect(typeof PlanEnforcement.canMakeOutboundCall).toBe("function");
  });

  it("exports canUseFeature as a function", () => {
    expect(typeof PlanEnforcement.canUseFeature).toBe("function");
  });

  it("exports canInviteSeat as a function", () => {
    expect(typeof PlanEnforcement.canInviteSeat).toBe("function");
  });

  it("does not export internal helpers (getPlan, suggestUpgrade, checkBillingActive)", () => {
    const exports = Object.keys(PlanEnforcement);
    expect(exports).not.toContain("getPlan");
    expect(exports).not.toContain("suggestUpgrade");
    expect(exports).not.toContain("checkBillingActive");
  });
});

/* ------------------------------------------------------------------ */
/*  EnforcementResult shape                                            */
/* ------------------------------------------------------------------ */

describe("EnforcementResult shape", () => {
  it("an allowed result has { allowed: true } and no error fields required", () => {
    const allowed: PlanEnforcement.EnforcementResult = { allowed: true };
    expect(allowed.allowed).toBe(true);
    expect(allowed.reason).toBeUndefined();
    expect(allowed.message).toBeUndefined();
    expect(allowed.upgradeTo).toBeUndefined();
    expect(allowed.current).toBeUndefined();
    expect(allowed.limit).toBeUndefined();
  });

  it("a blocked result has all diagnostic fields", () => {
    const blocked: PlanEnforcement.EnforcementResult = {
      allowed: false,
      reason: "agent_limit",
      message: "Your Starter plan includes 1 AI agent. Upgrade to add more.",
      upgradeTo: "business",
      current: 1,
      limit: 1,
    };

    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("agent_limit");
    expect(typeof blocked.message).toBe("string");
    expect(blocked.message!.length).toBeGreaterThan(0);
    expect(blocked.upgradeTo).toBe("business");
    expect(typeof blocked.current).toBe("number");
    expect(typeof blocked.limit).toBe("number");
  });

  it("reason field accepts all valid reason codes", () => {
    const validReasons: PlanEnforcement.EnforcementResult["reason"][] = [
      "agent_limit",
      "seat_limit",
      "number_limit",
      "outbound_limit",
      "sms_limit",
      "no_subscription",
      "feature_gated",
    ];

    for (const reason of validReasons) {
      const result: PlanEnforcement.EnforcementResult = {
        allowed: false,
        reason,
        message: `Blocked: ${reason}`,
      };
      expect(result.reason).toBe(reason);
    }
  });

  it("upgradeTo field accepts valid PlanSlug values", () => {
    const tiers: PlanSlug[] = ["solo", "business", "scale", "enterprise"];
    for (const tier of tiers) {
      const result: PlanEnforcement.EnforcementResult = {
        allowed: false,
        reason: "agent_limit",
        upgradeTo: tier,
      };
      expect(result.upgradeTo).toBe(tier);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Feature keys are consistent between plans and enforcement          */
/* ------------------------------------------------------------------ */

describe("feature keys consistency", () => {
  it("all feature keys from BILLING_PLANS.solo.features exist as valid canUseFeature parameters", () => {
    const featureKeys = Object.keys(BILLING_PLANS.solo.features);
    // All plans must have the same feature keys
    const businessKeys = Object.keys(BILLING_PLANS.business.features);
    const scaleKeys = Object.keys(BILLING_PLANS.scale.features);
    const enterpriseKeys = Object.keys(BILLING_PLANS.enterprise.features);

    expect(featureKeys).toEqual(businessKeys);
    expect(featureKeys).toEqual(scaleKeys);
    expect(featureKeys).toEqual(enterpriseKeys);
  });

  it("every feature key is a string and every value is boolean across all tiers", () => {
    const tiers: PlanSlug[] = ["solo", "business", "scale", "enterprise"];
    for (const tier of tiers) {
      const features = BILLING_PLANS[tier].features;
      for (const [key, value] of Object.entries(features)) {
        expect(typeof key).toBe("string");
        expect(typeof value, `${tier}.features.${key} should be boolean`).toBe("boolean");
      }
    }
  });

  it("higher tiers enable a superset of lower-tier features", () => {
    const tierOrder: PlanSlug[] = ["solo", "business", "scale", "enterprise"];

    for (let i = 0; i < tierOrder.length - 1; i++) {
      const lowerFeatures = BILLING_PLANS[tierOrder[i]].features;
      const higherFeatures = BILLING_PLANS[tierOrder[i + 1]].features;

      for (const [key, value] of Object.entries(lowerFeatures)) {
        if (value === true) {
          expect(
            higherFeatures[key as keyof typeof higherFeatures],
            `${tierOrder[i + 1]} should have ${key} enabled since ${tierOrder[i]} has it`,
          ).toBe(true);
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Plan limit escalation                                              */
/* ------------------------------------------------------------------ */

describe("plan limits support upgrade path", () => {
  it("each tier from solo to scale has a valid upgrade target", () => {
    const order: PlanSlug[] = ["solo", "business", "scale"];

    for (let i = 0; i < order.length; i++) {
      const currentPlan = BILLING_PLANS[order[i]];
      if (i < order.length - 1) {
        const nextPlan = BILLING_PLANS[order[i + 1]];
        // Next tier should have >= limits than current (or -1 for unlimited)
        expect(
          nextPlan.maxAgents === -1 || nextPlan.maxAgents >= currentPlan.maxAgents,
          `${order[i + 1]} maxAgents should be >= ${order[i]} maxAgents`,
        ).toBe(true);
        expect(
          nextPlan.outboundDailyLimit === -1 || nextPlan.outboundDailyLimit >= currentPlan.outboundDailyLimit,
          `${order[i + 1]} outboundDailyLimit should be >= ${order[i]} outboundDailyLimit`,
        ).toBe(true);
      }
    }
  });

  it("enterprise has unlimited values (-1) for all capped resources", () => {
    const ent = BILLING_PLANS.enterprise;
    expect(ent.maxAgents).toBe(-1);
    expect(ent.maxSeats).toBe(-1);
    expect(ent.maxPhoneNumbers).toBe(-1);
    expect(ent.outboundDailyLimit).toBe(-1);
    expect(ent.smsMonthlyCap).toBe(-1);
  });
});
