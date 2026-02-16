/**
 * Message Compiler — structured generation + deterministic rendering. No templates; no raw LLM text.
 */

export const MessageIntent = {
  follow_up: "follow_up",
  confirm_booking: "confirm_booking",
  reschedule_request: "reschedule_request",
  payment_link: "payment_link",
  payment_reminder: "payment_reminder",
  clarification: "clarification",
  close_loop: "close_loop",
  handoff_hold: "handoff_hold",
  acknowledgement_request: "acknowledgement_request",
  dispute_resolution: "dispute_resolution",
  outcome_confirmation: "outcome_confirmation",
} as const;

export type MessageIntentType = (typeof MessageIntent)[keyof typeof MessageIntent];

export type Stance = "confirm" | "request" | "inform" | "close";

export interface MessagePlanEntities {
  name?: string;
  time?: string;
  amount?: string;
  link?: string;
  service?: string;
  invoice_id?: string;
  booking_id?: string;
}

export interface MessagePlanConstraints {
  max_chars?: number;
  channel?: "sms" | "email" | "web";
  forbidden_terms?: string[];
  must_include?: string[];
}

export type Tone = "neutral" | "firm" | "warm";

/** Audience: message selection tone only. Same facts, different wording. NOT logic. */
export type Audience = "organization" | "professional" | "personal" | "public";

/** Clause types for deterministic composition. No template ids; small units only. */
export type ClauseType =
  | "acknowledgment"
  | "next_step"
  | "confirmation_request"
  | "payment_prompt"
  | "outcome"
  | "close_loop"
  | "handoff"
  | "record_expectation";

export interface ClausePlan {
  type: ClauseType;
}

export interface MessagePlan {
  intent: MessageIntentType;
  stance: Stance;
  entities: MessagePlanEntities;
  constraints: MessagePlanConstraints;
  tone: Tone;
  /** Audience: organization=operational, professional=workflow, personal=reassurance, public=factual. Tone selection only. */
  audience?: Audience;
  proof_anchor?: string;
  reason_tags: string[];
  /** Deterministic clause plan; renderer composes from these. No template ids. */
  clauses: ClausePlan[];
}

export interface BusinessContextForCompiler {
  business_name?: string;
  offer_summary?: string;
  pricing_range?: string;
}
