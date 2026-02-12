/**
 * Plan tiers by conversation volume. Not by company size.
 * Used for copy and future price/limit logic.
 */

export type PlanSlug = "starter" | "growth" | "scale";

export interface BillingPlan {
  slug: PlanSlug;
  label: string;
  description: string;
  /** Approximate conversation volume band */
  volume: "low" | "consistent" | "high";
}

export const BILLING_PLANS: BillingPlan[] = [
  { slug: "starter", label: "Starter", description: "Low volume", volume: "low" },
  { slug: "growth", label: "Growth", description: "Consistent inbound", volume: "consistent" },
  { slug: "scale", label: "Scale", description: "High inbound", volume: "high" },
];

export const DEFAULT_PLAN: PlanSlug = "starter";
