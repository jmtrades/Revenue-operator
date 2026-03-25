/**
 * Conversation stage engine. Deterministic. No GPT. No randomness.
 * Must not regress stage backwards unless contradiction detected.
 */

import type { OutcomeType } from "./outcome-taxonomy";

export type ConversationStage =
  | "initial"
  | "information_exchange"
  | "objection_handling"
  | "commitment_negotiation"
  | "compliance_confirmation"
  | "closing"
  | "post_commitment"
  | "escalated"
  | "terminated";

export const CONVERSATION_STAGES: readonly ConversationStage[] = [
  "initial",
  "information_exchange",
  "objection_handling",
  "commitment_negotiation",
  "compliance_confirmation",
  "closing",
  "post_commitment",
  "escalated",
  "terminated",
] as const;

const STAGE_ORDER: Record<ConversationStage, number> = {
  initial: 0,
  information_exchange: 1,
  objection_handling: 2,
  commitment_negotiation: 3,
  compliance_confirmation: 4,
  closing: 5,
  post_commitment: 6,
  escalated: 7,
  terminated: 8,
};

export interface ResolveConversationStageInput {
  previousStage: ConversationStage | null;
  outcomeType: OutcomeType | string | null;
  triageReason?: string | null;
  commitmentState?: { trustScore?: number; volatilityScore?: number } | null;
  /** When true, allow regression (e.g. contradiction detected). */
  contradictionDetected?: boolean;
}

/**
 * Resolve next conversation stage from previous and signals. Deterministic.
 * Does not regress backwards unless contradictionDetected.
 */
export function resolveConversationStage(input: ResolveConversationStageInput): ConversationStage {
  const { previousStage, outcomeType, triageReason, contradictionDetected } = input;
  const prev = previousStage ?? "initial";
  const order = (s: ConversationStage) => STAGE_ORDER[s] ?? 0;

  if (outcomeType === "opted_out") return "terminated";
  if (outcomeType === "legal_risk" || outcomeType === "escalation_required" || outcomeType === "hostile") return "escalated";
  if (outcomeType === "payment_made") return "post_commitment";
  if (outcomeType === "appointment_confirmed") return "closing";
  if (outcomeType === "payment_promised" || outcomeType === "call_back_requested") return "commitment_negotiation";
  if (outcomeType === "complaint" || outcomeType === "refund_request" || outcomeType === "dispute") return "objection_handling";
  if (triageReason === "compliance_risk" || outcomeType === "information_missing") return "compliance_confirmation";
  if (outcomeType === "information_provided" || outcomeType === "connected") {
    const next: ConversationStage = order(prev) < order("information_exchange") ? "information_exchange" : prev;
    return contradictionDetected ? "objection_handling" : next;
  }
  if (outcomeType === "no_answer" || outcomeType === "unknown") {
    return contradictionDetected ? "objection_handling" : prev;
  }

  if (contradictionDetected && order(prev) > order("objection_handling")) {
    return "objection_handling";
  }
  return prev;
}
