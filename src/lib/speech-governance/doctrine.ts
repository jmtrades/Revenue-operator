/**
 * Speech governance doctrine: caps, forbidden terms, deterministic helpers.
 * No persuasion; documentary only.
 */

export const MAX_SMS_CHARS = 320;
export const MAX_LINE_CHARS = 90;

const FORBIDDEN_WORDS = [
  "advice", "optimize", "optimization", "increase", "improve", "recommend", "should", "please",
  "your", "you", "we", "us", "better", "faster", "efficient", "performance", "KPI", "ROI",
  "dashboard", "analytics", "persuasion", "urgent", "immediately", "asap",
];

const FORBIDDEN_PHRASES = ["don't forget", "right away", "system will"];

export function sanitizeForbiddenWords(text: string): string {
  let out = text;
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      out = out.replace(new RegExp(phrase, "gi"), "").replace(/\s{2,}/g, " ").trim();
    }
  }
  for (const word of FORBIDDEN_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    out = out.replace(re, "").replace(/\s{2,}/g, " ").trim();
  }
  return out;
}

export function containsForbiddenLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) return true;
  }
  for (const word of FORBIDDEN_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(lower)) return true;
  }
  return false;
}

export function trimToMaxChars(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trim();
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
