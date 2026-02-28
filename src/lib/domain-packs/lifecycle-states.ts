/**
 * Lifecycle states for strategy engine. Full commercial lifecycle; no AI invents states.
 */

export const LIFECYCLE_STATES = [
  "cold_prospect",
  "warm_inbound",
  "appointment_set",
  "no_show",
  "recovered",
  "payment_pending",
  "contract_sent",
  "disclosure_required",
  "awaiting_compliance",
  "disputed",
  "reactivation",
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export const ALL_STRATEGY_AND_LIFECYCLE_STATES = [
  "discovery",
  "pain_identification",
  "qualification",
  "authority_check",
  "timeline_check",
  "financial_alignment",
  "objection_handling",
  "offer_positioning",
  "compliance_disclosure",
  "commitment_request",
  "follow_up_lock",
  "escalation",
  "disqualification",
  ...LIFECYCLE_STATES,
] as const;
