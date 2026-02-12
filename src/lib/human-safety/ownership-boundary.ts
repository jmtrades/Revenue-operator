/**
 * Relationship ownership boundary: system handles logistics only.
 * Block rapport-building, allow only clarification, scheduling, reminders, confirmations.
 */

export interface BoundaryResult {
  allowed: boolean;
  neutralized: boolean;
  message?: string;
  reason?: string;
}

const LOGISTICS_PURPOSE = [
  "schedule",
  "reschedule",
  "confirm",
  "remind",
  "clarif",
  "question",
  "help",
  "follow up",
  "following up",
  "open",
  "continue",
  "next step",
  "time",
  "call",
  "meeting",
];

const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /(?:hope you're doing (?:great|well)|hope all is well)/i, reason: "rapport" },
  { pattern: /(?:haha|hehe|lol|that's funny)/i, reason: "joke" },
  { pattern: /(?:great (?:work|job)|love (?:your|that)|impressed by)/i, reason: "compliment" },
  { pattern: /(?:I understand you (?:feel|want)|I hear your)/i, reason: "emotional_mirror" },
  { pattern: /(?:best price|we can do|let's make a deal)/i, reason: "price_negotiation" },
  { pattern: /(?:overcome that objection|address your concern)/i, reason: "objection_handling" },
  { pattern: /(?:let's close|ready to sign|moving forward)/i, reason: "closing_language" },
  { pattern: /(?:just (?:wanted|thought) (?:to|I'd) (?:say|mention))/i, reason: "personality_mirror" },
];

const NEUTRAL_REPLACEMENT = "Just following up — no rush at all. Let me know if you'd like me to keep this open.";

export function checkOwnershipBoundary(
  message: string,
  context: { action?: string }
): BoundaryResult {
  if (!message || message.length < 3) {
    return { allowed: true, neutralized: false };
  }

  const lower = message.toLowerCase();

  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      return {
        allowed: false,
        neutralized: true,
        message: NEUTRAL_REPLACEMENT,
        reason: `ownership: ${reason}`,
      };
    }
  }

  // Check if message serves a logistics purpose
  const hasLogisticsPurpose = LOGISTICS_PURPOSE.some((p) => lower.includes(p));

  const allowedActions = [
    "clarifying_question",
    "follow_up",
    "reminder",
    "prep_info",
    "question",
    "greeting",
    "booking",
    "call_invite",
    "next_step",
    "recovery",
    "win_back",
    "qualification_question",
  ];
  const actionOk = !context.action || allowedActions.includes(context.action);

  if (!hasLogisticsPurpose && !actionOk) {
    return {
      allowed: false,
      neutralized: true,
      message: NEUTRAL_REPLACEMENT,
      reason: "ownership: not_logistics",
    };
  }

  return { allowed: true, neutralized: false };
}
