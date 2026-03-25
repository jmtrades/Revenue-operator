/**
 * RevenueLifecycle — one per lead. Higher-level lifecycle intelligence layer.
 * Operators move leads through stages and revenue states.
 */

export const LIFECYCLE_STAGES = [
  "new_lead",
  "active_prospect",
  "scheduled",
  "showed",
  "client",
  "repeat_client",
  "at_risk",
  "lost",
  "reactivated",
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/** Revenue state — operators move leads between these */
export const REVENUE_LIFECYCLE_STATES = [
  "potential",
  "scheduled",
  "secured",
  "realized",
  "repeat",
  "at_risk",
  "lost",
  "recovered",
] as const;

export type RevenueLifecycleState = (typeof REVENUE_LIFECYCLE_STATES)[number];

export const LIFETIME_VALUE_STAGES = [
  "new",
  "first_visit",
  "repeat",
  "vip",
] as const;

export type LifetimeValueStage = (typeof LIFETIME_VALUE_STAGES)[number];

export interface RevenueLifecycle {
  id: string;
  lead_id: string;
  workspace_id: string;
  first_contact_at: string | null;
  booked_at: string | null;
  showed_at: string | null;
  last_visit_at: string | null;
  next_expected_visit_at: string | null;
  lifecycle_stage: LifecycleStage;
  lifetime_value_stage: LifetimeValueStage;
  revenue_state: RevenueLifecycleState;
  dropoff_risk: number; // 0-1
  created_at: string;
  updated_at: string;
}
