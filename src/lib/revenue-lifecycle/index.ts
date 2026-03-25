/**
 * Revenue Lifecycle — intelligence layer per lead.
 * Tracks first_contact_at, booked_at, showed_at, last_visit_at, next_expected_visit_at,
 * lifecycle_stage, lifetime_value_stage, revenue_state, dropoff_risk.
 * Operators move leads between states.
 */

export {
  LIFECYCLE_STAGES,
  REVENUE_LIFECYCLE_STATES,
  LIFETIME_VALUE_STAGES,
} from "./types";
export type {
  RevenueLifecycle,
  LifecycleStage,
  RevenueLifecycleState,
  LifetimeValueStage,
} from "./types";
export { getRevenueLifecycle, upsertRevenueLifecycle } from "./store";
export type { RevenueLifecycleRow } from "./store";
export {
  syncFirstContact,
  syncBooked,
  syncShowed,
  syncNoShow,
  syncFromLeadState,
} from "./sync";
