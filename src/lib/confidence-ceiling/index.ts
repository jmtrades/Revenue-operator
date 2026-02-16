/**
 * Confidence Ceiling: operator must not act when interpretation certainty is low.
 * When unsure, defer or escalate instead of improvising.
 * Goal: operator never causes irreversible damage from misunderstanding.
 */

import { getConversationContext, resolveConversationState } from "@/lib/conversation-state/resolver";
import { detectSensitiveIntent } from "@/lib/safe-responses";
import { computeEmotionalComplexityScore, EMOTIONAL_ESCALATION_THRESHOLD } from "@/lib/human-presence/emotional-complexity";

const AMBIGUITY_CONFIDENCE_THRESHOLD = 0.7;

/** Message could change outcome: substantive and could affect commitment/booking/objection. */
function messageCouldChangeOutcome(message: string): boolean {
  const t = message.trim();
  if (t.length < 12) return false;
  const lower = t.toLowerCase();
  const outcomeKeywords =
    /book|schedule|call|meeting|cancel|reschedule|refund|price|cost|deal|discount|yes|no|interested|not interested|complaint|legal|lawyer|sue|contract|agree|sign|commit|when|where|how much/i;
  return outcomeKeywords.test(lower) || t.length > 80;
}

/** User intent conflicts with booking state: has booking but message suggests cancel/reschedule/dispute. */
function intentConflictsWithBooking(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const conflictSignals =
    /cancel|reschedule|can't make it|won't be there|can not make|refund|dispute|wrong (date|time)|need to (change|move|postpone)|legal|lawyer|complaint|sue|not (going|attending)/i;
  return conflictSignals.test(lower);
}

/** Strong negative emotional tone or legal/financial risk → escalate. */
function strongNegativeOrLegalFinancial(
  message: string,
  emotionalScore: number
): { escalate: boolean; reason?: string } {
  const sensitive = detectSensitiveIntent([], message);
  if (sensitive === "anger")
    return { escalate: true, reason: "anger_detected" };
  if (sensitive === "legal_medical")
    return { escalate: true, reason: "legal_medical_risk" };
  if (sensitive === "refund_request")
    return { escalate: true, reason: "financial_risk" };
  if (emotionalScore >= EMOTIONAL_ESCALATION_THRESHOLD)
    return { escalate: true, reason: "emotional_complexity" };
  return { escalate: false };
}

export interface ConfidenceCeilingParams {
  leadId: string;
  conversationId: string;
  lastUserMessage: string;
  leadState: string;
  decisionConfidence: number;
  minConfidenceToAct: number;
}

export interface ConfidenceCeilingResult {
  /** Escalate immediately; do not respond automatically. */
  escalate?: boolean;
  /** Escalation reason for logging. */
  reason?: string;
  /** Use clarification question instead of decision attempt (caller sends clarification, does not act). */
  useClarification?: boolean;
}

/**
 * Run confidence ceiling checks. Call before building/sending a response.
 * Returns escalate → do not respond; use human escalation.
 * Returns useClarification → send clarification question only; do not attempt decision.
 */
export async function checkConfidenceCeiling(
  params: ConfidenceCeilingParams
): Promise<ConfidenceCeilingResult> {
  const {
    leadId,
    conversationId,
    lastUserMessage,
    leadState,
    decisionConfidence,
    minConfidenceToAct,
  } = params;

  const hasUpcomingBooking = leadState === "BOOKED" || leadState === "SCHEDULED";

  // 1) Ambiguous meaning AND message could change outcome → escalate
  try {
    const ctx = await getConversationContext(leadId, conversationId);
    const stateResult = await resolveConversationState({
      ...ctx,
      message: lastUserMessage || ctx.message,
    });
    const ambiguous = stateResult.confidence < AMBIGUITY_CONFIDENCE_THRESHOLD;
    const outcomeCritical = messageCouldChangeOutcome(lastUserMessage || ctx.message);
    if (ambiguous && outcomeCritical) {
      return { escalate: true, reason: "ambiguous_meaning_outcome_critical" };
    }
  } catch {
    // If state resolution fails, treat as ambiguous when message is outcome-critical
    if (messageCouldChangeOutcome(lastUserMessage)) {
      return { escalate: true, reason: "ambiguous_meaning_outcome_critical" };
    }
  }

  // 2) User intent conflicts with booking state → escalate (do not attempt correction)
  if (hasUpcomingBooking && intentConflictsWithBooking(lastUserMessage)) {
    return { escalate: true, reason: "intent_conflicts_with_booking" };
  }

  // 3) Strong negative emotional or legal/financial risk → escalate
  const emotionalScore = computeEmotionalComplexityScore({
    lastMessage: lastUserMessage,
    messageLength: lastUserMessage.length,
    objectionCount: 0,
    hasNegotiationKeywords: /discount|deal|negotiate|lower|cheaper|budget|can't afford|too expensive/i.test(lastUserMessage),
  });
  const emotionalCheck = strongNegativeOrLegalFinancial(lastUserMessage, emotionalScore);
  if (emotionalCheck.escalate && emotionalCheck.reason) {
    return { escalate: true, reason: emotionalCheck.reason };
  }

  // 4) AI confidence < internal threshold → use clarification instead of decision
  if (decisionConfidence < minConfidenceToAct) {
    return { useClarification: true };
  }

  return {};
}

/** Default clarification message when confidence is below threshold (no decision attempt). */
export const CLARIFICATION_MESSAGE = "What were you looking to get done?";
