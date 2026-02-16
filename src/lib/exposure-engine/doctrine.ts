/**
 * Exposure engine: user-visible strings. No numbers, ≤90 chars, factual only.
 */

export const MAX_LINE_LEN = 90;

export const EXPOSURE_LINES: Record<string, string> = {
  reply_delay_risk: "A conversation would have remained without response.",
  attendance_uncertainty_risk: "Attendance would have remained uncertain.",
  payment_stall_risk: "Payment would have remained incomplete.",
  counterparty_unconfirmed_risk: "Confirmation would have remained unreceived.",
  commitment_outcome_uncertain: "An outcome would have remained unconfirmed.",
};

export const FIRST_INTERRUPTION_ORIENTATION = "The process prevented an operational failure.";

/** Single generic line for proof capsule when any interrupted exposure in period. */
export const PROOF_CAPSULE_PROTECTION_LINE = "An operational failure did not continue.";

const FORBIDDEN = [
  "you", "your", "we", "us", "click", "dashboard", "metric", "ROI", "saved",
  "increase", "improve", "optimize", "performance", "percent", "score",
];
const FORBIDDEN_PHRASES = ["don't forget", "right away", "system will"];
const NUMBERS = /\d|%|percent|percentile|score|ROI|KPI|saved|revenue|efficiency|optimization|improvement|performance|metric/i;

export function hasForbiddenWords(text: string): boolean {
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) return true;
  }
  for (const word of FORBIDDEN) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) return true;
  }
  return false;
}

export function hasNumbers(text: string): boolean {
  return NUMBERS.test(text);
}

/** Single sentence, ≤90 chars. */
export function sanitizeLine(text: string): string {
  let s = (text ?? "").trim();
  const match = s.match(/^[^.!?]+[.!?]?/);
  if (match) s = match[0].trim();
  if (s.length > MAX_LINE_LEN) s = s.slice(0, MAX_LINE_LEN).trim();
  return s || "";
}
