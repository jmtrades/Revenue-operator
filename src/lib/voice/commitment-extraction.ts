/**
 * Phase 12c.4 — Commitment extraction from call transcripts.
 *
 * Research gap (Phase 12a): "The AI said it would send me a follow-up and
 * never did" is the #1 trust-killing complaint across AI voice platforms.
 * Competing systems track signals (confirmation reply, deposit paid) but
 * don't parse the actual commitments spoken on the call — so the AI
 * promises "I'll have pricing to you by Friday" and no task is created.
 *
 * This module parses a call transcript (or utterance stream) and extracts
 * structured commitments:
 *   - callback commitments      ("I'll call you back Tuesday at 2pm")
 *   - information-send          ("I'll email you the pricing sheet tonight")
 *   - appointment               ("Let's meet Thursday")
 *   - document-send             ("I'll send over the contract")
 *   - payment                   ("You can expect the invoice by the 15th")
 *   - amount                    ("$250/month", "fifteen hundred dollars")
 *
 * Pure function. Regex + date-phrase parsing. Feeds into commitment-registry
 * (persisted) and warm-transfer-brief (surfaced).
 */

export type ExtractedCommitmentType =
  | "callback"
  | "info_send"
  | "appointment"
  | "document_send"
  | "payment"
  | "price_quote"
  | "other";

export interface TranscriptCommitment {
  type: ExtractedCommitmentType;
  description: string;
  /** Parsed ISO date (local) if a when-clause was detected. */
  whenIso: string | null;
  /** Raw when-phrase from transcript, e.g. "next Tuesday at 2pm". */
  whenPhrase: string | null;
  /** Numeric amount in USD if a dollar figure was detected. */
  amountUsd: number | null;
  /** Confidence 0..1. */
  confidence: number;
  /** Transcript excerpt containing the match. */
  excerpt: string;
  /** Who promised: "agent" (our side) or "caller" (their side). */
  speaker: "agent" | "caller" | "unknown";
}

export interface TranscriptUtterance {
  /** "agent" = our AI/rep; "caller" = prospect. */
  speaker: "agent" | "caller";
  text: string;
}

// ---------------------------------------------------------------------------
// Date/time phrase parsing (lightweight; no external lib).
//
// We accept common conversational forms:
//   "tomorrow", "today", "tonight"
//   "Monday", "next Tuesday", "this Friday"
//   "the 15th", "March 3rd", "April 22"
//   "by Friday", "before the end of the week"
// ---------------------------------------------------------------------------

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11,
};

/** Best-effort extraction of a when-phrase and its ISO equivalent. */
export function extractWhen(text: string, now: Date = new Date()): { phrase: string | null; iso: string | null } {
  const s = text.toLowerCase();

  // Simple relative words
  if (/\btomorrow\b/.test(s)) return { phrase: "tomorrow", iso: shift(now, 1) };
  if (/\btonight\b/.test(s)) return { phrase: "tonight", iso: shift(now, 0, 20) };
  if (/\btoday\b/.test(s)) return { phrase: "today", iso: shift(now, 0) };
  if (/\b(end of (the )?week|eow)\b/.test(s)) {
    const dow = now.getDay();
    const daysToFri = (5 - dow + 7) % 7 || 7;
    return { phrase: "end of week", iso: shift(now, daysToFri) };
  }
  if (/\b(end of (the )?month|eom)\b/.test(s)) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { phrase: "end of month", iso: d.toISOString() };
  }

  // Weekday references: "(next |this )?monday"
  const weekdayMatch = s.match(
    /\b(next|this|coming|following)?\s*(sunday|sun|monday|mon|tuesday|tues?|wednesday|wed|thursday|thur?s?|friday|fri|saturday|sat)\b/,
  );
  if (weekdayMatch) {
    const qualifier = weekdayMatch[1] ?? "";
    const name = weekdayMatch[2];
    const target = WEEKDAYS[name];
    if (target !== undefined) {
      let delta = (target - now.getDay() + 7) % 7;
      if (delta === 0) delta = 7; // "Monday" mid-Monday = next Monday
      if (qualifier === "next") delta = delta + 7 > 13 ? delta : delta + 7;
      const phrase = `${qualifier} ${name}`.trim();
      return { phrase, iso: shift(now, delta) };
    }
  }

  // "March 15", "Apr 3rd"
  const monthMatch = s.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept?|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/,
  );
  if (monthMatch) {
    const mo = MONTHS[monthMatch[1]];
    const day = parseInt(monthMatch[2], 10);
    if (mo !== undefined && day >= 1 && day <= 31) {
      let year = now.getFullYear();
      const candidate = new Date(year, mo, day, 12);
      if (candidate.getTime() < now.getTime() - 24 * 3600 * 1000) year += 1;
      return { phrase: monthMatch[0], iso: new Date(year, mo, day, 12).toISOString() };
    }
  }

  // "the 15th" (this month or next, whichever is closer in future)
  const dayMatch = s.match(/\bthe\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      let mo = now.getMonth();
      let year = now.getFullYear();
      if (day < now.getDate()) {
        mo += 1;
        if (mo > 11) { mo = 0; year += 1; }
      }
      return { phrase: dayMatch[0], iso: new Date(year, mo, day, 12).toISOString() };
    }
  }

  return { phrase: null, iso: null };
}

function shift(now: Date, days: number, hour = 12): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

export function extractAmountUsd(text: string): number | null {
  const s = text.toLowerCase();
  // "$1,250" / "$250.00" / "$15k"
  const dollar = s.match(/\$\s?([0-9][0-9,]*\.?[0-9]*)\s?([km])?/i);
  if (dollar) {
    const base = parseFloat(dollar[1].replace(/,/g, ""));
    if (!isNaN(base)) {
      const mult = dollar[2]?.toLowerCase() === "k" ? 1000 : dollar[2]?.toLowerCase() === "m" ? 1_000_000 : 1;
      return base * mult;
    }
  }
  // "1,250 dollars" / "250 bucks"
  const numDollars = s.match(/\b([0-9][0-9,]*\.?[0-9]*)\s+(dollars|bucks|usd)\b/);
  if (numDollars) {
    const v = parseFloat(numDollars[1].replace(/,/g, ""));
    if (!isNaN(v)) return v;
  }
  // "fifteen hundred dollars" / "two thousand dollars" — simple parser for short phrases
  const wordMatch = s.match(
    /\b((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:\s+(?:hundred|thousand))?(?:\s+(?:one|two|three|four|five|six|seven|eight|nine))?)\s+(?:hundred\s+)?(?:dollars|bucks)\b/,
  );
  if (wordMatch) {
    const words = wordMatch[1].split(/\s+/);
    let total = 0;
    let current = 0;
    for (const w of words) {
      const v = NUMBER_WORDS[w];
      if (v === undefined) continue;
      if (v === 100 || v === 1000) {
        current = Math.max(1, current) * v;
        total += current;
        current = 0;
      } else {
        current += v;
      }
    }
    total += current;
    if (total > 0) return total;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Commitment pattern library.
// ---------------------------------------------------------------------------

interface CommitmentPattern {
  type: ExtractedCommitmentType;
  pattern: RegExp;
  confidence: number;
}

const AGENT_COMMITMENT_PATTERNS: CommitmentPattern[] = [
  // Callback
  { type: "callback", pattern: /\bi(?:'ll| will) (?:call|ring|phone|reach out to|get back to) you\b/i, confidence: 0.9 },
  { type: "callback", pattern: /\b(?:let me|i('|’)ll) (give|call|ring) you (?:a )?(?:call|back)\b/i, confidence: 0.9 },

  // Info-send / document-send
  { type: "info_send", pattern: /\bi(?:'ll| will) (send|email|shoot|forward)(?:\s+you)?(?:\s+(?:the|an?))?\s+(?:details|info|information|summary|link|quote|pricing)\b/i, confidence: 0.9 },
  { type: "document_send", pattern: /\bi(?:'ll| will) (send|email|share)(?:\s+you)?(?:\s+(?:the|an?))?\s+(contract|agreement|proposal|spec sheet|brochure|pdf|document)\b/i, confidence: 0.92 },

  // Appointment
  { type: "appointment", pattern: /\b(?:let('|’)s|i('|’)ll) (?:(book|schedule|set up|lock (in|down)))\s+(?:a |an )?(?:time|meeting|call|demo|appointment)\b/i, confidence: 0.9 },
  { type: "appointment", pattern: /\bi(?:'ll| will) put (?:that|it|something) on (?:the|your) calendar\b/i, confidence: 0.9 },

  // Payment / invoice
  { type: "payment", pattern: /\bi(?:'ll| will) (?:send|email|generate|issue) (you )?(?:an )?invoice\b/i, confidence: 0.9 },

  // Price quote
  { type: "price_quote", pattern: /\b(?:the|our) (?:price|pricing|cost|rate) (?:is|would be|comes (?:out to|in at))\b/i, confidence: 0.85 },
  { type: "price_quote", pattern: /\bi(?:'ll| will) (?:send|get) (?:you )?(?:a |an )?quote\b/i, confidence: 0.85 },

  // Generic
  { type: "other", pattern: /\bi(?:'ll| will) (follow up|check (?:on|into) that|look into (?:it|that))\b/i, confidence: 0.7 },
];

const CALLER_COMMITMENT_PATTERNS: CommitmentPattern[] = [
  { type: "callback", pattern: /\bi(?:'ll| will) call you (back|tomorrow|later|next week)\b/i, confidence: 0.85 },
  { type: "payment", pattern: /\bi(?:'ll| will) (pay|send payment|wire|transfer) (?:you )?\$?\d/i, confidence: 0.9 },
  { type: "appointment", pattern: /\bi(?:'ll| will) be there\b/i, confidence: 0.7 },
  { type: "other", pattern: /\bi(?:'ll| will) (let you know|think about it|get back to you)\b/i, confidence: 0.6 },
];

/**
 * Extract commitments from a raw transcript (single speaker or unknown).
 *
 * For most accurate results pass structured utterances to
 * extractCommitmentsFromUtterances().
 */
export function extractCommitmentsFromText(
  text: string,
  speaker: "agent" | "caller" | "unknown" = "unknown",
  now: Date = new Date(),
): TranscriptCommitment[] {
  const commits: TranscriptCommitment[] = [];
  const patterns = speaker === "agent"
    ? AGENT_COMMITMENT_PATTERNS
    : speaker === "caller"
      ? CALLER_COMMITMENT_PATTERNS
      : [...AGENT_COMMITMENT_PATTERNS, ...CALLER_COMMITMENT_PATTERNS];

  // Work on sentences so the when-clause stays attached to the promise.
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    for (const p of patterns) {
      const m = sentence.match(p.pattern);
      if (!m) continue;
      const when = extractWhen(sentence, now);
      const amount = extractAmountUsd(sentence);
      // Only produce the "price_quote" entry if an amount was actually given
      if (p.type === "price_quote" && amount == null) continue;
      commits.push({
        type: p.type,
        description: sentence.trim().slice(0, 280),
        whenIso: when.iso,
        whenPhrase: when.phrase,
        amountUsd: amount,
        confidence: p.confidence + (when.iso ? 0.05 : 0) + (amount != null ? 0.05 : 0),
        excerpt: sentence.trim().slice(0, 280),
        speaker,
      });
    }
  }

  return dedupeCommitments(commits);
}

/**
 * Preferred entry-point: pass utterances tagged with speaker.
 */
export function extractCommitmentsFromUtterances(
  utterances: TranscriptUtterance[],
  now: Date = new Date(),
): TranscriptCommitment[] {
  const all: TranscriptCommitment[] = [];
  for (const u of utterances) {
    const c = extractCommitmentsFromText(u.text, u.speaker, now);
    all.push(...c);
  }
  return dedupeCommitments(all);
}

function dedupeCommitments(list: TranscriptCommitment[]): TranscriptCommitment[] {
  const seen = new Set<string>();
  const out: TranscriptCommitment[] = [];
  for (const c of list) {
    const sig = `${c.type}|${(c.whenIso ?? "").slice(0, 10)}|${c.amountUsd ?? ""}|${c.excerpt.slice(0, 50)}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(c);
  }
  return out;
}
