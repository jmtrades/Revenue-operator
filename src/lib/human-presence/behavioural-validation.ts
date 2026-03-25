/**
 * Behavioural Validation Layer — reject messages that feel too structured or robotic.
 * If rejected → return shorter/simpler version.
 */

export interface ValidationResult {
  pass: boolean;
  message: string;
  reason?: string;
}

function countSentences(text: string): number {
  return (text.trim().split(/[.!?]+/).filter((s) => s.trim().length > 0)).length;
}

/**
 * Simulate human detection: reject if too structured, too complete, answers everything, too fast.
 */
export function validateBehaviouralHuman(message: string): ValidationResult {
  const trimmed = message.trim();
  if (!trimmed) return { pass: false, message: "What were you looking to get done?", reason: "empty" };

  // Too many sentences (answers everything at once)
  const sentences = countSentences(trimmed);
  if (sentences > 2) {
    const parts = trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
    const shorter = parts.slice(0, 2).join(" ").trim();
    return { pass: false, message: shorter || trimmed.slice(0, 120).trim(), reason: "too_complete" };
  }

  // Bullet-like structure
  if (/^[\s•\-*]\s*m/i.test(trimmed) || /\n[\s•\-*]\s/g.test(trimmed)) {
    const firstLine = trimmed.split(/\n/)[0]?.replace(/^[\s•\-*]+\s*/, "").trim() ?? trimmed;
    return { pass: false, message: firstLine.slice(0, 160), reason: "too_structured" };
  }

  // Very long single sentence
  if (trimmed.length > 220) {
    const atSpace = trimmed.lastIndexOf(" ", 180);
    const shorter = atSpace > 100 ? trimmed.slice(0, atSpace) : trimmed.slice(0, 180);
    return { pass: false, message: shorter.trim() + (/\w$/.test(shorter) ? "." : ""), reason: "too_long" };
  }

  return { pass: true, message: trimmed };
}
