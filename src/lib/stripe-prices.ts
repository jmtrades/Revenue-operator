/**
 * Stripe price resolution: tier + interval → price_id.
 * Deterministic mapping from env. No AI. Used by checkout and trial/start.
 */

import type { BillingTier } from "@/lib/feature-gate/types";
import { getStripe } from "@/lib/billing/stripe-client";

export type BillingInterval = "month" | "year";

/** Tiers that have a Stripe price (checkout/trial). Enterprise is contract-only. */
const TIERS_WITH_PRICE: BillingTier[] = ["solo", "business", "scale"];
const INTERVALS: BillingInterval[] = ["month", "year"];

const ENV_KEYS: Record<BillingTier, Record<BillingInterval, string>> = {
  solo: { month: "STRIPE_PRICE_SOLO_MONTH", year: "STRIPE_PRICE_SOLO_YEAR" },
  business: { month: "STRIPE_PRICE_BUSINESS_MONTH", year: "STRIPE_PRICE_BUSINESS_YEAR" },
  scale: { month: "STRIPE_PRICE_SCALE_MONTH", year: "STRIPE_PRICE_SCALE_YEAR" },
  enterprise: { month: "STRIPE_PRICE_ENTERPRISE_MONTH", year: "STRIPE_PRICE_ENTERPRISE_YEAR" },
};

/** Legacy env var names (growth→business, team→scale) for backwards compatibility */
const LEGACY_ENV_KEYS: Partial<Record<BillingTier, Record<BillingInterval, string>>> = {
  business: { month: "STRIPE_PRICE_GROWTH_MONTH", year: "STRIPE_PRICE_GROWTH_YEAR" },
  scale: { month: "STRIPE_PRICE_TEAM_MONTH", year: "STRIPE_PRICE_TEAM_YEAR" },
};

export type PriceResolutionReason =
  | "invalid_tier"
  | "invalid_interval"
  | "missing_price_id"
  | "wrong_price_mode"
  | "stripe_unreachable";

export interface PriceResolution {
  ok: true;
  price_id: string;
  tier: BillingTier;
  interval: BillingInterval;
}

export interface PriceResolutionError {
  ok: false;
  reason: PriceResolutionReason;
}

export function resolvePriceId(
  tier: string,
  interval: string
): { price_id: string; tier: BillingTier; interval: BillingInterval } | null {
  const t = tier?.toLowerCase().trim() as BillingTier;
  const i = interval?.toLowerCase().trim() as BillingInterval;
  if (!TIERS_WITH_PRICE.includes(t) || !INTERVALS.includes(i)) return null;
  const key = ENV_KEYS[t][i];
  let priceId = process.env[key]?.trim();
  if (!priceId || priceId === "price_placeholder") {
    // Check legacy env var name
    const legacyKey = LEGACY_ENV_KEYS[t]?.[i];
    if (legacyKey) priceId = process.env[legacyKey]?.trim();
  }
  if (!priceId || priceId === "price_placeholder") return null;
  return { price_id: priceId, tier: t, interval: i };
}

/** Get price_id for tier + interval. Validates env and optional Stripe recurring check. */
export async function getPriceId(
  tier: string,
  interval: string
): Promise<PriceResolution | PriceResolutionError> {
  const t = tier?.toLowerCase().trim() as BillingTier;
  const i = interval?.toLowerCase().trim() as BillingInterval;
  if (!TIERS_WITH_PRICE.includes(t)) {
    return { ok: false, reason: "invalid_tier" };
  }
  if (!INTERVALS.includes(i)) {
    return { ok: false, reason: "invalid_interval" };
  }
  const key = ENV_KEYS[t][i];
  let priceId = process.env[key]?.trim();
  if (!priceId || priceId === "price_placeholder") {
    // Check legacy env var name
    const legacyKey = LEGACY_ENV_KEYS[t]?.[i];
    if (legacyKey) priceId = process.env[legacyKey]?.trim();
  }
  if (!priceId || priceId === "price_placeholder") {
    return { ok: false, reason: "missing_price_id" };
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { ok: false, reason: "stripe_unreachable" };
  }
  try {
    // Phase 78/Phase 6: shared factory with pinned apiVersion
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    if (price.type !== "recurring") {
      return { ok: false, reason: "wrong_price_mode" };
    }
    return { ok: true, price_id: priceId, tier: t, interval: i };
  } catch {
    return { ok: false, reason: "stripe_unreachable" };
  }
}

/** Map Stripe price_id back to tier + interval. Used by webhook. Never throws. */
export function priceIdToTierAndInterval(priceId: string | null): {
  tier: BillingTier;
  interval: BillingInterval;
} | null {
  if (!priceId?.trim()) return null;
  const pid = priceId.trim();
  const env = process.env;
  for (const tier of TIERS_WITH_PRICE) {
    for (const interval of INTERVALS) {
      const key = ENV_KEYS[tier][interval];
      const val = env[key]?.trim();
      if (val && val !== "price_placeholder" && val === pid) {
        return { tier, interval };
      }
      // Also check legacy env var names
      const legacyKey = LEGACY_ENV_KEYS[tier]?.[interval];
      if (legacyKey) {
        const legacyVal = env[legacyKey]?.trim();
        if (legacyVal && legacyVal !== "price_placeholder" && legacyVal === pid) {
          return { tier, interval };
        }
      }
    }
  }
  return null;
}
