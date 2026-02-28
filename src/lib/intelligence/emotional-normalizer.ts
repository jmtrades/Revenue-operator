/**
 * Emotional Signal Normalization — deterministic categorization from structured data only.
 * No freeform interpretation. No GPT. Structured keywords + outcome flags only.
 */

export type EmotionalCategory =
  | "calm"
  | "neutral"
  | "resistant"
  | "hostile"
  | "uncertain"
  | "positive";

/** Structured voice outcome fields used for categorization. */
export interface VoiceOutcomeStructured {
  outcome?: string | null;
  consent_recorded?: boolean | null;
  disclosures_read?: boolean | null;
  objection_key?: string | null;
  next_required_action?: string | null;
  notes_structured?: Record<string, unknown> | null;
}

/** Response metadata (e.g. from message or connector). */
export interface ResponseMetadata {
  risk_flags?: string[] | null;
  sentiment_flag?: string | null;
  urgency_score?: number | null;
  skepticism_score?: number | null;
  aggression_level?: number | null;
}

const HOSTILE_KEYWORDS = ["anger", "aggressive", "hostile", "abusive", "threat"];
const RESISTANT_KEYWORDS = ["objection", "pushback", "skeptical", "decline", "not interested", "opt_out"];
const UNCERTAIN_KEYWORDS = ["unsure", "maybe", "hesitant", "need to think", "confused"];
const POSITIVE_KEYWORDS = ["agree", "confirmed", "yes", "committed", "interested"];

/**
 * Categorize emotional state from structured voice outcome only.
 * Deterministic: keywords + outcome flags. No AI.
 */
export function categorizeFromVoiceOutcome(input: VoiceOutcomeStructured): EmotionalCategory {
  const next = input.next_required_action?.toLowerCase() ?? "";
  const objection = (input.objection_key ?? "").toLowerCase();
  const notes = input.notes_structured;
  const noteStr = typeof notes === "object" && notes !== null
    ? JSON.stringify(notes).toLowerCase()
    : "";

  if (input.outcome === "completed" && input.consent_recorded === true && input.disclosures_read === true) {
    return "positive";
  }
  if (next === "escalate_to_human") return "resistant";
  if (objection || noteStr.includes("objection")) return "resistant";

  for (const k of HOSTILE_KEYWORDS) {
    if (noteStr.includes(k)) return "hostile";
  }
  for (const k of RESISTANT_KEYWORDS) {
    if (noteStr.includes(k) || objection) return "resistant";
  }
  for (const k of UNCERTAIN_KEYWORDS) {
    if (noteStr.includes(k)) return "uncertain";
  }
  for (const k of POSITIVE_KEYWORDS) {
    if (noteStr.includes(k)) return "positive";
  }

  if (input.outcome === "completed" || input.outcome === "connected") return "calm";
  if (input.outcome === "no_answer" || input.outcome === "voicemail") return "neutral";
  return "neutral";
}

/**
 * Categorize from response metadata (e.g. pre_classified from inbound).
 * Deterministic: risk_flags + sentiment + scores.
 */
export function categorizeFromResponseMetadata(meta: ResponseMetadata): EmotionalCategory {
  const flags = meta.risk_flags ?? [];
  const sentiment = (meta.sentiment_flag ?? "").toLowerCase();
  const aggression = Number(meta.aggression_level) || 0;
  const skepticism = Number(meta.skepticism_score) || 0;

  if (flags.some((f) => f.toLowerCase().includes("anger") || f.toLowerCase().includes("hostile"))) return "hostile";
  if (aggression >= 0.6) return "hostile";
  if (sentiment === "negative" || skepticism >= 0.6) return "resistant";
  if (flags.some((f) => f.toLowerCase().includes("opt_out") || f.toLowerCase().includes("unsubscribe"))) return "resistant";
  if (sentiment === "positive") return "positive";
  if ((Number(meta.urgency_score) || 0) >= 0.7) return "positive";
  return "neutral";
}
