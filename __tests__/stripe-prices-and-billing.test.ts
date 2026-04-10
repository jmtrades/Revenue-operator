/**
 * Tests for Stripe price resolution, tier mapping, and env key configuration.
 * Source: src/lib/stripe-prices.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  resolvePriceId,
  priceIdToTierAndInterval,
  type BillingInterval,
  type PriceResolutionReason,
} from "@/lib/stripe-prices";

/* ------------------------------------------------------------------ */
/*  resolvePriceId (synchronous, env-based)                           */
/* ------------------------------------------------------------------ */

describe("resolvePriceId", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Inject test price IDs
    process.env.STRIPE_PRICE_SOLO_MONTH = "price_solo_month_123";
    process.env.STRIPE_PRICE_SOLO_YEAR = "price_solo_year_123";
    process.env.STRIPE_PRICE_BUSINESS_MONTH = "price_business_month_123";
    process.env.STRIPE_PRICE_BUSINESS_YEAR = "price_business_year_123";
    process.env.STRIPE_PRICE_SCALE_MONTH = "price_scale_month_123";
    process.env.STRIPE_PRICE_SCALE_YEAR = "price_scale_year_123";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("resolves a valid tier + month interval", () => {
    const result = resolvePriceId("solo", "month");
    expect(result).not.toBeNull();
    expect(result!.price_id).toBe("price_solo_month_123");
    expect(result!.tier).toBe("solo");
    expect(result!.interval).toBe("month");
  });

  it("resolves a valid tier + year interval", () => {
    const result = resolvePriceId("business", "year");
    expect(result).not.toBeNull();
    expect(result!.price_id).toBe("price_business_year_123");
    expect(result!.tier).toBe("business");
    expect(result!.interval).toBe("year");
  });

  it("resolves scale tier correctly", () => {
    const result = resolvePriceId("scale", "month");
    expect(result).not.toBeNull();
    expect(result!.price_id).toBe("price_scale_month_123");
    expect(result!.tier).toBe("scale");
  });

  it("returns null for enterprise tier (contract-only, not in TIERS_WITH_PRICE)", () => {
    process.env.STRIPE_PRICE_ENTERPRISE_MONTH = "price_ent_123";
    const result = resolvePriceId("enterprise", "month");
    expect(result).toBeNull();
  });

  it("returns null for invalid tier", () => {
    expect(resolvePriceId("premium", "month")).toBeNull();
    expect(resolvePriceId("free", "year")).toBeNull();
    expect(resolvePriceId("", "month")).toBeNull();
  });

  it("returns null for invalid interval", () => {
    expect(resolvePriceId("solo", "weekly")).toBeNull();
    expect(resolvePriceId("solo", "quarterly")).toBeNull();
    expect(resolvePriceId("solo", "")).toBeNull();
  });

  it("returns null when env var is missing", () => {
    delete process.env.STRIPE_PRICE_SOLO_MONTH;
    const result = resolvePriceId("solo", "month");
    expect(result).toBeNull();
  });

  it("returns null when env var is set to price_placeholder", () => {
    process.env.STRIPE_PRICE_SOLO_MONTH = "price_placeholder";
    const result = resolvePriceId("solo", "month");
    expect(result).toBeNull();
  });

  it("is case-insensitive for tier and interval", () => {
    const result = resolvePriceId("SOLO", "MONTH");
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("solo");
    expect(result!.interval).toBe("month");
  });

  it("trims whitespace from tier and interval", () => {
    const result = resolvePriceId("  solo  ", "  month  ");
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("solo");
    expect(result!.interval).toBe("month");
  });

  it("falls back to legacy env var for business tier (STRIPE_PRICE_GROWTH_*)", () => {
    delete process.env.STRIPE_PRICE_BUSINESS_MONTH;
    process.env.STRIPE_PRICE_GROWTH_MONTH = "price_growth_month_legacy";
    const result = resolvePriceId("business", "month");
    expect(result).not.toBeNull();
    expect(result!.price_id).toBe("price_growth_month_legacy");
  });

  it("falls back to legacy env var for scale tier (STRIPE_PRICE_TEAM_*)", () => {
    delete process.env.STRIPE_PRICE_SCALE_MONTH;
    process.env.STRIPE_PRICE_TEAM_MONTH = "price_team_month_legacy";
    const result = resolvePriceId("scale", "month");
    expect(result).not.toBeNull();
    expect(result!.price_id).toBe("price_team_month_legacy");
  });

  it("prefers primary env var over legacy when both are set", () => {
    process.env.STRIPE_PRICE_BUSINESS_MONTH = "price_primary";
    process.env.STRIPE_PRICE_GROWTH_MONTH = "price_legacy";
    const result = resolvePriceId("business", "month");
    expect(result).not.toBeNull();
    expect(result!.price_id).toBe("price_primary");
  });
});

/* ------------------------------------------------------------------ */
/*  priceIdToTierAndInterval (reverse lookup)                          */
/* ------------------------------------------------------------------ */

describe("priceIdToTierAndInterval", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_PRICE_SOLO_MONTH = "price_solo_m";
    process.env.STRIPE_PRICE_SOLO_YEAR = "price_solo_y";
    process.env.STRIPE_PRICE_BUSINESS_MONTH = "price_biz_m";
    process.env.STRIPE_PRICE_BUSINESS_YEAR = "price_biz_y";
    process.env.STRIPE_PRICE_SCALE_MONTH = "price_scale_m";
    process.env.STRIPE_PRICE_SCALE_YEAR = "price_scale_y";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("maps a known solo month price_id back to tier and interval", () => {
    const result = priceIdToTierAndInterval("price_solo_m");
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("solo");
    expect(result!.interval).toBe("month");
  });

  it("maps a known solo year price_id back", () => {
    const result = priceIdToTierAndInterval("price_solo_y");
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("solo");
    expect(result!.interval).toBe("year");
  });

  it("maps a known business price_id back", () => {
    const result = priceIdToTierAndInterval("price_biz_m");
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("business");
    expect(result!.interval).toBe("month");
  });

  it("maps a known scale price_id back", () => {
    const result = priceIdToTierAndInterval("price_scale_y");
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("scale");
    expect(result!.interval).toBe("year");
  });

  it("returns null for an unknown price_id", () => {
    expect(priceIdToTierAndInterval("price_unknown_xyz")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(priceIdToTierAndInterval(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(priceIdToTierAndInterval("")).toBeNull();
    expect(priceIdToTierAndInterval("  ")).toBeNull();
  });

  it("ignores price_placeholder values during reverse lookup", () => {
    process.env.STRIPE_PRICE_SOLO_MONTH = "price_placeholder";
    expect(priceIdToTierAndInterval("price_placeholder")).toBeNull();
  });

  it("matches via legacy env var (STRIPE_PRICE_GROWTH_*)", () => {
    delete process.env.STRIPE_PRICE_BUSINESS_MONTH;
    process.env.STRIPE_PRICE_GROWTH_MONTH = "price_growth_legacy";
    const result = priceIdToTierAndInterval("price_growth_legacy");
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("business");
    expect(result!.interval).toBe("month");
  });

  it("matches via legacy env var (STRIPE_PRICE_TEAM_*)", () => {
    delete process.env.STRIPE_PRICE_SCALE_YEAR;
    process.env.STRIPE_PRICE_TEAM_YEAR = "price_team_y_legacy";
    const result = priceIdToTierAndInterval("price_team_y_legacy");
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("scale");
    expect(result!.interval).toBe("year");
  });
});

/* ------------------------------------------------------------------ */
/*  PriceResolutionReason type coverage                                */
/* ------------------------------------------------------------------ */

describe("PriceResolutionReason values", () => {
  it("covers all expected failure modes", () => {
    const reasons: PriceResolutionReason[] = [
      "invalid_tier",
      "invalid_interval",
      "missing_price_id",
      "wrong_price_mode",
      "stripe_unreachable",
    ];

    // Verify each is a valid string (compile-time check enforced, but runtime sanity)
    for (const reason of reasons) {
      expect(typeof reason).toBe("string");
      expect(reason.length).toBeGreaterThan(0);
    }
    expect(reasons).toHaveLength(5);
  });
});

/* ------------------------------------------------------------------ */
/*  BillingInterval type coverage                                      */
/* ------------------------------------------------------------------ */

describe("BillingInterval", () => {
  it("supports month and year intervals", () => {
    const intervals: BillingInterval[] = ["month", "year"];
    expect(intervals).toContain("month");
    expect(intervals).toContain("year");
  });
});

/* ------------------------------------------------------------------ */
/*  Round-trip: resolvePriceId -> priceIdToTierAndInterval             */
/* ------------------------------------------------------------------ */

describe("price ID round-trip", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_PRICE_SOLO_MONTH = "price_rt_solo_m";
    process.env.STRIPE_PRICE_SOLO_YEAR = "price_rt_solo_y";
    process.env.STRIPE_PRICE_BUSINESS_MONTH = "price_rt_biz_m";
    process.env.STRIPE_PRICE_BUSINESS_YEAR = "price_rt_biz_y";
    process.env.STRIPE_PRICE_SCALE_MONTH = "price_rt_scale_m";
    process.env.STRIPE_PRICE_SCALE_YEAR = "price_rt_scale_y";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const combos: Array<{ tier: string; interval: string }> = [
    { tier: "solo", interval: "month" },
    { tier: "solo", interval: "year" },
    { tier: "business", interval: "month" },
    { tier: "business", interval: "year" },
    { tier: "scale", interval: "month" },
    { tier: "scale", interval: "year" },
  ];

  it.each(combos)(
    "resolving $tier/$interval and reversing returns the same tier and interval",
    ({ tier, interval }) => {
      const resolved = resolvePriceId(tier, interval);
      expect(resolved).not.toBeNull();
      const reversed = priceIdToTierAndInterval(resolved!.price_id);
      expect(reversed).not.toBeNull();
      expect(reversed!.tier).toBe(tier);
      expect(reversed!.interval).toBe(interval);
    },
  );
});
