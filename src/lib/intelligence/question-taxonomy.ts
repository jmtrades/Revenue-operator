/**
 * Question taxonomy. Strict allowlists. No GPT.
 */

export type QuestionType =
  | "pricing"
  | "availability"
  | "scheduling"
  | "cancellation_terms"
  | "refund"
  | "proof"
  | "identity"
  | "compliance"
  | "payment_method"
  | "address"
  | "product_scope"
  | "contract"
  | "escalation_request"
  | "other";

export type ResolutionType = "answered" | "redirected" | "escalated" | "not_applicable";

export const QUESTION_TYPES: readonly QuestionType[] = [
  "pricing",
  "availability",
  "scheduling",
  "cancellation_terms",
  "refund",
  "proof",
  "identity",
  "compliance",
  "payment_method",
  "address",
  "product_scope",
  "contract",
  "escalation_request",
  "other",
] as const;

export const RESOLUTION_TYPES: readonly ResolutionType[] = [
  "answered",
  "redirected",
  "escalated",
  "not_applicable",
] as const;

export type QuestionSourceChannel = "voice" | "message" | "system";
