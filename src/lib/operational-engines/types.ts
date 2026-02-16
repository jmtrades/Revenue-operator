/**
 * Operational engines — type contract only.
 * Engines produce or consume canonical signals; they do not mutate state directly.
 * See OPERATIONAL_INFRASTRUCTURE.md.
 */

/** Six business risks the system exists to remove. */
export type OperationalRisk =
  | "lost_revenue"
  | "delayed_revenue"
  | "reduced_revenue"
  | "expensive_revenue"
  | "wasted_time"
  | "human_error";

/** Ten operational engines. */
export const OPERATIONAL_ENGINE_IDS = [
  "revenue_completion",
  "payment_recovery",
  "retention_reactivation",
  "bottleneck_removal",
  "commitment_reliability",
  "support_load_reduction",
  "human_error_prevention",
  "profit_expansion",
  "time_compression",
  "trust_proof",
] as const;

export type OperationalEngineId = (typeof OPERATIONAL_ENGINE_IDS)[number];

/** Billing tier: scope of operational dependency. */
export const OPERATIONAL_TIERS = [1, 2, 3, 4, 5] as const;

export type OperationalTier = (typeof OPERATIONAL_TIERS)[number];

/** Tier names for reference (not for UI display). */
export const TIER_NAMES: Record<OperationalTier, string> = {
  1: "Continuity",
  2: "Revenue",
  3: "Operations",
  4: "Autopilot",
  5: "Enterprise Infrastructure",
};
