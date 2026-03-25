/**
 * Natural Variation Engine — imperfect human patterns.
 * Occasionally shorter, longer, ask vs tell, omit greeting, lowercase start.
 * No grammar or spelling errors.
 */

/**
 * Apply micro-variations to a message (probabilistic).
 */
export function applyNaturalVariation(message: string): string {
  if (!message || message.length < 3) return message;
  let out = message.trim();

  // Occasionally lowercase start (~25%)
  if (Math.random() < 0.25 && /^[A-Z]/.test(out)) {
    out = out.slice(0, 1).toLowerCase() + out.slice(1);
  }

  // Occasionally drop leading "Hey — " or "Hi " (~20%)
  if (Math.random() < 0.2) {
    if (/^hey\s*—\s*/i.test(out)) out = out.replace(/^hey\s*—\s*/i, "").trim();
    else if (/^hi\s+\w+\.?\s*/i.test(out)) out = out.replace(/^hi\s+\w+\.?\s*/i, "").trim();
  }

  return out.length > 0 ? out : message.trim();
}
