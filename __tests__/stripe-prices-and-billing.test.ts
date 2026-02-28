/**
 * Tier mapping, Stripe price resolution, billing interval, webhook tier sync.
 * Feature gating message. Pricing route contract. Billing status contract.
 * No forbidden words. Annual text does not contain percentage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  resolvePriceId,
  getPriceId,
  priceIdToTierAndInterval,
} from "@/lib/stripe-prices";
import { FEATURE_UNAVAILABLE_MESSAGE } from "@/lib/billing-copy";
import { getTierFeatures } from "@/lib/feature-gate";
import type { BillingTier } from "@/lib/feature-gate/types";

describe("Stripe price resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  describe("resolvePriceId", () => {
    it("returns null for invalid tier", () => {
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_123";
      expect(resolvePriceId("invalid", "month")).toBeNull();
      expect(resolvePriceId("enterprise", "month")).toBeNull();
    });

    it("returns null for invalid interval", () => {
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_123";
      expect(resolvePriceId("solo", "weekly")).toBeNull();
    });

    it("returns price_id for valid tier and interval when env set", () => {
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_solo_month";
      process.env.STRIPE_PRICE_GROWTH_YEAR = "price_growth_year";
      expect(resolvePriceId("solo", "month")).toEqual({
        price_id: "price_solo_month",
        tier: "solo",
        interval: "month",
      });
      expect(resolvePriceId("growth", "year")).toEqual({
        price_id: "price_growth_year",
        tier: "growth",
        interval: "year",
      });
    });

    it("returns null when price env is placeholder or missing", () => {
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_placeholder";
      expect(resolvePriceId("solo", "month")).toBeNull();
      process.env.STRIPE_PRICE_SOLO_MONTH = undefined;
      expect(resolvePriceId("solo", "month")).toBeNull();
    });
  });

  describe("getPriceId", () => {
    it("returns invalid_tier for enterprise", async () => {
      const result = await getPriceId("enterprise", "month");
      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("invalid_tier");
    });

    it("returns invalid_interval for invalid interval", async () => {
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_123";
      const result = await getPriceId("solo", "quarterly");
      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("invalid_interval");
    });

    it("returns missing_price_id when env not set", async () => {
      process.env.STRIPE_PRICE_SOLO_MONTH = undefined;
      const result = await getPriceId("solo", "month");
      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("missing_price_id");
    });
  });

  describe("priceIdToTierAndInterval", () => {
    it("returns null for null or empty price_id", () => {
      expect(priceIdToTierAndInterval(null)).toBeNull();
      expect(priceIdToTierAndInterval("")).toBeNull();
    });

    it("returns tier and interval when price_id matches env", () => {
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_solo_m";
      process.env.STRIPE_PRICE_TEAM_YEAR = "price_team_y";
      expect(priceIdToTierAndInterval("price_solo_m")).toEqual({ tier: "solo", interval: "month" });
      expect(priceIdToTierAndInterval("price_team_y")).toEqual({ tier: "team", interval: "year" });
    });

    it("returns null for unknown price_id", () => {
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_known";
      expect(priceIdToTierAndInterval("price_unknown")).toBeNull();
    });
  });
});

describe("Feature gating", () => {
  it("uses FEATURE_UNAVAILABLE_MESSAGE instead of upgrade language", () => {
    expect(FEATURE_UNAVAILABLE_MESSAGE).toBe("Not available for current plan.");
    expect(FEATURE_UNAVAILABLE_MESSAGE).not.toMatch(/upgrade|unlock/i);
  });

  it("Team tier has dual_approval", () => {
    const team = getTierFeatures("team");
    expect(team.dual_approval).toBe(true);
  });
});

describe("Pricing page contract", () => {
  it("annual pricing text does not contain percentage", async () => {
    const { ANNUAL_NOTE } = await import("@/app/pricing/page");
    expect(ANNUAL_NOTE).not.toMatch(/\d+%|percent|save\s+\d+/i);
  });

  it("pricing page has no forbidden positioning words", async () => {
    const forbidden = ["AI assistant", "automation", "bot", "ChatGPT", "workflow"];
    const { pricingCopyForTests } = await import("@/app/pricing/page");
    const copy = pricingCopyForTests();
    for (const word of forbidden) {
      expect(copy).not.toContain(word);
    }
  });
});
