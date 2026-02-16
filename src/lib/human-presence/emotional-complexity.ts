/**
 * Emotional Complexity Score — escalate when complexity exceeds automation confidence.
 * Based on: sentiment intensity, message length, negotiation complexity, repeated objections.
 */

export interface EmotionalComplexityInput {
  lastMessage: string;
  messageLength: number;
  objectionCount?: number;
  hasNegotiationKeywords?: boolean;
  sentimentHint?: "negative" | "neutral" | "positive";
}

const NEGATIVE_PHRASES = /frustrated|angry|unacceptable|ridiculous|terrible|worst|refund|cancel|complaint|legal|lawyer|sue/i;
const NEGOTIATION_PHRASES = /discount|deal|negotiate|lower|cheaper|budget|can't afford|too expensive/i;

/**
 * Score 0–1. High score → recommend escalate.
 */
export function computeEmotionalComplexityScore(input: EmotionalComplexityInput): number {
  const { lastMessage, messageLength, objectionCount = 0, hasNegotiationKeywords, sentimentHint } = input;
  const lower = lastMessage.toLowerCase();
  let score = 0;

  if (sentimentHint === "negative") score += 0.35;
  if (NEGATIVE_PHRASES.test(lower)) score += 0.3;
  if (messageLength > 150) score += 0.15;
  if (messageLength > 300) score += 0.1;
  if (hasNegotiationKeywords || NEGOTIATION_PHRASES.test(lower)) score += 0.2;
  if (objectionCount >= 2) score += 0.25;
  if (objectionCount >= 3) score += 0.15;

  return Math.min(1, score);
}

export const EMOTIONAL_ESCALATION_THRESHOLD = 0.55;

export function shouldEscalateByEmotion(score: number): boolean {
  return score >= EMOTIONAL_ESCALATION_THRESHOLD;
}
