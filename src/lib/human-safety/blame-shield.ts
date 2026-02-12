/**
 * Blame shield: messages must be screenshot-defendable.
 * No persuasion tactics, false assumptions, or emotional interpretation.
 */

export interface ShieldResult {
  message: string;
  modified: boolean;
  reason?: string;
}

const EMBARRASSING_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /(?:guarantee|100%|promise you)/gi, reason: "outcome_claim" },
  { pattern: /(?:I know you (?:want|need|love|will))/gi, reason: "false_assumption" },
  { pattern: /(?:you (?:must|have to|should) (?:act|decide|move))/gi, reason: "pressure" },
  { pattern: /(?:perfect (?:for you|fit)|exactly what you)/gi, reason: "persuasion" },
  { pattern: /(?:I can tell you (?:are|feel|want))/gi, reason: "emotional_interpretation" },
  { pattern: /(?:limited spots|only X left|hurry)/gi, reason: "scarcity" },
  { pattern: /(?:don't miss out|you won't regret)/gi, reason: "fomo" },
  { pattern: /(?:everyone (?:loves|uses|agrees))/gi, reason: "social_proof_tactic" },
  { pattern: /(?:trust me|believe me)/gi, reason: "trust_claim" },
  { pattern: /(?:I'm sure you'll|you're going to love)/gi, reason: "outcome_assumption" },
];

const SAFE_FALLBACK = "Just following up — no rush at all. Let me know if you'd like me to keep this open.";

export function applyBlameShield(
  message: string,
  _context: { action?: string }
): ShieldResult {
  if (!message || message.length < 3) {
    return { message: message ?? "", modified: false };
  }

  for (const { pattern, reason } of EMBARRASSING_PATTERNS) {
    if (pattern.test(message)) {
      return {
        message: SAFE_FALLBACK,
        modified: true,
        reason: `blame_shield: ${reason}`,
      };
    }
  }

  return { message, modified: false };
}
