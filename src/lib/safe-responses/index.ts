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
    "Pricing depends on what you need. Easiest is a quick call and we can give you a straight answer.",
  refund_request:
    "I'll get the owner to message you about that shortly.",
  anger:
    "Got it — what would help most from here?",
  legal_medical:
    "I can't give advice on that — you'd need to speak to a professional. Anything else I can help with?",
  negotiation:
    "I hear you. Easiest way is a quick call and we can see what fits.",
};

export function getSafeResponse(type: SensitiveType): string {
  return RESPONSES[type] ?? RESPONSES.pricing_request;
}

/** Escalation holding message: human receptionist handoff. */
export function getEscalationHoldingMessage(): string {
  return "Let me grab the owner — they'll message you shortly.";
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
