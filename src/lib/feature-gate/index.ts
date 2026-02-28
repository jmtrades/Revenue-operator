/**
 * Pricing layer feature gating — deterministic by billing tier.
 */

export {
  resolveBillingTier,
  getTierFeatures,
  allowFeature,
  getMaxDomainPacks,
  getMaxChannels,
} from "./resolver";

export {
  BILLING_TIERS,
  TIER_FEATURES,
  type BillingTier,
  type FeatureKey,
  type TierFeatures,
} from "./types";
