/**
 * Revenue State Engine — top-level classification for loss prevention.
 * Every lead is classified into one of five revenue states.
 * All downstream logic depends on this.
 */

export const REVENUE_STATES = [
  "REVENUE_INCOMING",
  "REVENUE_FRAGILE",
  "REVENUE_AT_RISK",
  "REVENUE_LOST",
  "REVENUE_SECURED",
] as const;

export type RevenueState = (typeof REVENUE_STATES)[number];

export const INTERVENTION_TYPES = [
  "CONTINUITY_ACTION",
  "DECISION_CLARIFICATION",
  "ATTENDANCE_PROTECTION",
  "POST_CALL_STABILISATION",
  "RECOVERY_ACTION",
  "HUMAN_ALERT",
  "NO_ACTION",
] as const;

export type InterventionType = (typeof INTERVENTION_TYPES)[number];

/** Map legacy action names to intervention types. */
export const ACTION_TO_INTERVENTION: Record<string, InterventionType> = {
  greeting: "DECISION_CLARIFICATION",
  question: "DECISION_CLARIFICATION",
  clarifying_question: "DECISION_CLARIFICATION",
  qualification_question: "DECISION_CLARIFICATION",
  follow_up: "CONTINUITY_ACTION",
  discovery_questions: "DECISION_CLARIFICATION",
  value_proposition: "CONTINUITY_ACTION",
  booking: "CONTINUITY_ACTION",
  call_invite: "CONTINUITY_ACTION",
  reminder: "ATTENDANCE_PROTECTION",
  prep_info: "ATTENDANCE_PROTECTION",
  next_step: "POST_CALL_STABILISATION",
  retention: "CONTINUITY_ACTION",
  referral_ask: "CONTINUITY_ACTION",
  recovery: "RECOVERY_ACTION",
  feedback_request: "RECOVERY_ACTION",
  check_in: "CONTINUITY_ACTION",
  upsell: "CONTINUITY_ACTION",
  win_back: "RECOVERY_ACTION",
  offer: "RECOVERY_ACTION",
};

export interface RevenueStateResult {
  state: RevenueState;
  confidence_of_loss: number; // 0–1, higher = more likely to lose
  transition_toward_risk_at: string | null; // ISO timestamp when lead may move to AT_RISK
  risk_factors: string[];
}
