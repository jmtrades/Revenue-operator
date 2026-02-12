/**
 * Awkwardness prevention: detect and rewrite risky patterns.
 * Target: short, neutral, clear, one purpose, no emotional inference.
 */

export interface FilterResult {
  message: string;
  modified: boolean;
  reason?: string;
}

const SAFE_FALLBACK = "Just following up — no rush at all. Let me know if you'd like me to keep this open.";

const RISKY_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /awesome!!|great news!!|excellent!!/gi, reason: "excitement_tone" },
  { pattern: /😊|😄|🙂|👍|✨|🔥|💪/g, reason: "emoji" },
  { pattern: /just checking in/i, reason: "fake_familiarity" },
  { pattern: /\?\?\s*$|\!\!\s*$/g, reason: "exclamation_pressure" },
  { pattern: /(?:^|[.!?]\s+)[^.!?]*[!]{2,}[^.!?]*[.!?]?/g, reason: "exclamation_marks" },
  { pattern: /(?:don't miss|limited time|act now|last chance|hurry)/gi, reason: "urgency_pressure" },
  { pattern: /(?:I (?:think|feel|bet) you|I know you|you must be)/gi, reason: "assumption_feelings" },
  { pattern: /(?:perfect for you|exactly what you need|you'll love)/gi, reason: "persuasion_framing" },
  { pattern: /(?:once in a lifetime|amazing opportunity|incredible)/gi, reason: "sales_tactics" },
  { pattern: /(?:wouldn't you agree|makes sense, right\?|sound good\?)/gi, reason: "rhetorical_question" },
];

/** Count sentences */
function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) || []).length;
}

/** Count questions */
function countQuestions(text: string): number {
  return (text.match(/\?/g) || []).length;
}

/** Check if lead used emoji first (we'd need context - for now assume false) */
export function filterAwkwardness(
  message: string,
  context: { leadUsedEmoji?: boolean }
): FilterResult {
  if (!message || message.length < 5) {
    return { message, modified: false };
  }

  const trimMsg = message.trim();
  let out = trimMsg;
  let reason: string | undefined;

  // Risky patterns → rewrite to fallback if severe
  for (const { pattern, reason: r } of RISKY_PATTERNS) {
    if (pattern.test(out)) {
      // Emoji: only block if lead didn't use first
      if (r === "emoji" && context.leadUsedEmoji) continue;
      return {
        message: SAFE_FALLBACK,
        modified: true,
        reason: r,
      };
    }
  }

  // Exclamation marks (single, non-emoji)
  if (/!/.test(out) && !context.leadUsedEmoji) {
    out = out.replace(/!/g, ".");
    reason = reason ?? "exclamation_marks";
  }

  // Long paragraphs
  const paragraphs = out.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length > 1) {
    out = paragraphs[0]!.trim();
    reason = reason ?? "long_paragraphs";
  }

  // Multi-question messages
  if (countQuestions(out) > 1) {
    const firstPart = out.split("?")[0];
    out = firstPart ? `${firstPart}?` : out;
    reason = reason ?? "multi_question";
  }

  // More than 2 sentences
  if (countSentences(out) > 2) {
    const parts = out.split(/(?<=[.!?])\s+/);
    out = parts.slice(0, 2).join(" ").trim();
    reason = reason ?? "too_long";
  }

  return {
    message: out || SAFE_FALLBACK,
    modified: out !== trimMsg,
    reason,
  };
}
