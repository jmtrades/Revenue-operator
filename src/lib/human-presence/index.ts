/**
 * Human Presence Model — behaviour layer between Decision and Action.
 * Modifies: timing, variation, context recall, followup type, escalation judgement.
 * Does not modify state machine correctness.
 */

import type { ConversationState } from "@/lib/conversation-state/resolver";
import { resolveHumanizedDelay, recordResponseDelay } from "./response-delay";
import { getConversationMemory, maybeWeaveMemory } from "./conversation-memory";
import { applyNaturalVariation } from "./natural-variation";
import { validateBehaviouralHuman } from "./behavioural-validation";
import { computeMomentum } from "./momentum";
import { maybePrependPresencePhrase } from "./presence-simulation";
import { computeEmotionalComplexityScore, shouldEscalateByEmotion, EMOTIONAL_ESCALATION_THRESHOLD } from "./emotional-complexity";

export type { ConversationState };
export { recordResponseDelay, getConversationMemory, computeMomentum };
export { getFollowupCategory, getIntentAwareFollowup, type FollowupCategory } from "./intent-followup";
export { shouldEscalateByEmotion, EMOTIONAL_ESCALATION_THRESHOLD };

export interface HumanPresenceInput {
  leadId: string;
  workspaceId: string;
  conversationId: string;
  state: ConversationState;
  message: string;
  lastUserMessage?: string;
  objectionCount?: number;
}

export interface HumanPresenceResult {
  content: string;
  sendAt: Date;
  delaySeconds: number;
  emotionalScore?: number;
  shouldEscalateByEmotion?: boolean;
}

/**
 * Run the full behaviour layer: delay, memory, variation, validation, presence.
 */
export async function applyHumanPresence(input: HumanPresenceInput): Promise<HumanPresenceResult> {
  const { leadId, workspaceId: _workspaceId, conversationId, state, message, lastUserMessage = "", objectionCount = 0 } = input;

  const momentum = await computeMomentum({
    leadId,
    conversationId,
    lastUserMessageLength: lastUserMessage.length,
    bookingIntentSignals: /book|schedule|when can we|call (me|us)|available/i.test(lastUserMessage),
  });

  const { delaySeconds, sendAt } = await resolveHumanizedDelay(leadId, state, momentum.delayMultiplier);

  let content = message;

  const memory = await getConversationMemory(leadId);
  content = maybeWeaveMemory(content, memory);

  // Booking confidence: high engagement → shorter, more decisive (Part 6)
  if (momentum.directness === "push" && content.includes(".")) {
    const firstSentence = content.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length >= 15) content = firstSentence + ".";
  }

  content = applyNaturalVariation(content);

  const validation = validateBehaviouralHuman(content);
  if (!validation.pass) content = validation.message;

  const presence = await maybePrependPresencePhrase(leadId, content);
  content = presence.message;

  const emotionalScore = computeEmotionalComplexityScore({
    lastMessage: lastUserMessage,
    messageLength: lastUserMessage.length,
    objectionCount,
    hasNegotiationKeywords: /discount|deal|negotiate|lower|cheaper|budget|can't afford|too expensive/i.test(lastUserMessage),
  });
  const shouldEscalateByEmotion = emotionalScore >= EMOTIONAL_ESCALATION_THRESHOLD;

  return {
    content,
    sendAt,
    delaySeconds,
    emotionalScore,
    shouldEscalateByEmotion,
  };
}
