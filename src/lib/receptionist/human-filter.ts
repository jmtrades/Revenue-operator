/**
 * Human-Standard Revenue Operator — message filter.
 * Every message must pass: would a real operator at a high-end business say this?
 * Optimise for believability, not intelligence. Short, casual, purposeful.
 */

export interface HumanFilterResult {
  valid: boolean;
  message: string;
  reason?: string;
}

/** Phrases that must never appear (robotic, assistant, AI, support-doc). */
const FORBIDDEN_PHRASES = [
  "thank you for reaching out",
  "thanks for reaching out",
  "i would be happy to assist",
  "i'd be happy to assist",
  "happy to assist",
  "based on your message",
  "i understand your concern",
  "as an assistant",
  "i can help you with that",
  "how can i help you today",
  "how can i help",
  "ai ",
  "automation",
  " automated ",
  "system ",
  "workflow",
  "bot",
  "model",
  "analysis",
  "following up regarding your inquiry",
  "regarding your inquiry",
  "regarding your message",
  "as per your",
  "please be advised",
  "i hope this message finds you",
  "do not hesitate",
  "feel free to",
  "at your earliest convenience",
  "kind regards",
  "best regards",
  "warm regards",
];

/** Max exclamations in one message. */
const MAX_EXCLAMATIONS = 1;

/** Max sentences unless answering a direct question (we allow 2 for clarity). */
const MAX_SENTENCES = 2;

/** Fallback when message fails filter: short, progress-oriented. */
const OPERATOR_FALLBACK = "Hey — what were you looking to get done?";

function countSentences(text: string): number {
  return (text.trim().split(/[.!?]+/).filter((s) => s.trim().length > 0)).length;
}

function countExclamations(text: string): number {
  return (text.match(/!/g) || []).length;
}

/** Strip to first 1–2 sentences and cap length. */
function shortenToOperatorStyle(text: string): string {
  let out = text.trim();
  const sentences = out.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  if (sentences.length > MAX_SENTENCES) {
    out = sentences.slice(0, MAX_SENTENCES).join(" ").trim();
  }
  if (out.length > 180) {
    const atSpace = out.lastIndexOf(" ", 160);
    out = (atSpace > 80 ? out.slice(0, atSpace) : out.slice(0, 160)).trim();
    if (!/[-.!?]$/.test(out)) out += ".";
  }
  return out || OPERATOR_FALLBACK;
}

/**
 * Run HUMAN FILTER on a candidate message.
 * If valid, returns it (optionally trimmed). If not, returns shortened/simplified or fallback.
 */
export function applyHumanReceptionistFilter(message: string): HumanFilterResult {
  if (!message || typeof message !== "string") {
    return { valid: false, message: OPERATOR_FALLBACK, reason: "empty" };
  }

  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // Forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      const simplified = shortenToOperatorStyle(trimmed.replace(new RegExp(phrase, "gi"), "").replace(/\s+/g, " ").trim());
      return {
        valid: false,
        message: simplified.length > 10 ? simplified : OPERATOR_FALLBACK,
        reason: "forbidden_phrase",
      };
    }
  }

  // Exclamation overload
  if (countExclamations(trimmed) > MAX_EXCLAMATIONS) {
    const fixed = trimmed.replace(/!+/g, ".");
    return {
      valid: false,
      message: shortenToOperatorStyle(fixed),
      reason: "exclamation_overload",
    };
  }

  // Too many sentences
  if (countSentences(trimmed) > MAX_SENTENCES) {
    return {
      valid: false,
      message: shortenToOperatorStyle(trimmed),
      reason: "too_many_sentences",
    };
  }

  // Emojis — strip unless business allows (we strip by default for high-end operator)
  const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  if (emojiPattern.test(trimmed)) {
    const noEmoji = trimmed.replace(emojiPattern, "").replace(/\s+/g, " ").trim();
    const fallback = noEmoji.length > 15 ? noEmoji : OPERATOR_FALLBACK;
    return { valid: false, message: shortenToOperatorStyle(fallback), reason: "emoji" };
  }

  // Slightly over length — trim
  if (trimmed.length > 220) {
    return {
      valid: true,
      message: shortenToOperatorStyle(trimmed),
      reason: "trimmed_length",
    };
  }

  return { valid: true, message: trimmed };
}
