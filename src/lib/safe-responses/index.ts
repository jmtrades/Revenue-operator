/**
 * Safe response library for sensitive situations.
 * Controlled micro-scripts—never generic fallback only.
 */

export type SensitiveType =
  | "pricing_request"
  | "refund_request"
  | "anger"
  | "legal_medical"
  | "negotiation";

const RESPONSES: Record<SensitiveType, string> = {
  pricing_request:
    "Thanks for your interest. Pricing depends on your specific needs. I'd be happy to set up a quick call so we can give you an accurate quote. Would that work?",
  refund_request:
    "I understand you'd like to discuss a refund. Let me connect you with someone who can help right away. I'll have our team reach out within one business day.",
  anger:
    "I'm sorry you're frustrated. Your experience matters. I'd like to help—what would be the most helpful next step for you?",
  legal_medical:
    "I'm not able to provide legal or medical advice. I'd recommend consulting a qualified professional for that. Is there something else I can help with today?",
  negotiation:
    "I hear you. Let me see what options we have for your situation. Would a quick call work so we can explore the best fit?",
};

export function getSafeResponse(type: SensitiveType): string {
  return RESPONSES[type] ?? RESPONSES.pricing_request;
}

/** Escalation holding message: acknowledge + timeline. Neutral, no pressure. */
export function getEscalationHoldingMessage(): string {
  return "Thanks for reaching out. I'm looping in our team. Someone will follow up within 24 hours.";
}

export function detectSensitiveIntent(
  riskFlags: string[],
  lastMessage: string
): SensitiveType | null {
  const lower = lastMessage.toLowerCase();
  if (riskFlags.includes("anger")) return "anger";
  if (lower.includes("refund") || lower.includes("money back")) return "refund_request";
  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) return "pricing_request";
  if (lower.includes("legal") || lower.includes("medical") || lower.includes("advice")) return "legal_medical";
  if (lower.includes("discount") || lower.includes("deal") || lower.includes("negotiate")) return "negotiation";
  return null;
}
