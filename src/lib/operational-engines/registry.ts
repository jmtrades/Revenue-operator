/**
 * Operational engines registry: which engines belong to which tier, which risks they address.
 * Used for billing scope and for gating behaviour by workspace tier.
 * No state mutation; pure mapping.
 */

import type { OperationalEngineId, OperationalTier, OperationalRisk } from "./types";

/** Engines included in each tier (cumulative: tier N includes all engines from tiers 1..N). */
export const ENGINES_BY_TIER: Record<OperationalTier, OperationalEngineId[]> = {
  1: ["revenue_completion", "human_error_prevention", "trust_proof"],
  2: ["payment_recovery", "commitment_reliability"],
  3: ["bottleneck_removal", "time_compression"],
  4: ["retention_reactivation", "support_load_reduction", "profit_expansion"],
  5: [],
};

/** Flatten: for a given tier, all engines that are in scope. */
export function getEnginesForTier(tier: OperationalTier): OperationalEngineId[] {
  const set = new Set<OperationalEngineId>();
  for (let t = 1; t <= tier; t++) {
    for (const e of ENGINES_BY_TIER[t as OperationalTier]) {
      set.add(e);
    }
  }
  return [...set];
}

/** Which risk(s) each engine addresses. */
export const ENGINE_RISKS: Record<OperationalEngineId, OperationalRisk[]> = {
  revenue_completion: ["lost_revenue", "delayed_revenue"],
  payment_recovery: ["lost_revenue", "delayed_revenue"],
  retention_reactivation: ["lost_revenue", "reduced_revenue"],
  bottleneck_removal: ["delayed_revenue", "wasted_time"],
  commitment_reliability: ["lost_revenue", "delayed_revenue", "human_error"],
  support_load_reduction: ["expensive_revenue", "wasted_time"],
  human_error_prevention: ["human_error"],
  profit_expansion: ["reduced_revenue"],
  time_compression: ["wasted_time"],
  trust_proof: ["human_error"],
};

/** Whether a given engine is allowed for a tier. */
export function isEngineAllowedForTier(engineId: OperationalEngineId, tier: OperationalTier): boolean {
  return getEnginesForTier(tier).includes(engineId);
}
