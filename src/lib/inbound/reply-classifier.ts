/**
 * Phase 12c.8 — Inbound reply classifier.
 *
 * Research gap (Phase 12a): sales engagement platforms (Outreach, Salesloft,
 * Apollo, Reply.io) classify replies as "interested / not interested / OOO"
 * with high false-positive rates — reps repeatedly complain about "wrong
 * person" or "referral" replies being mis-routed as "interested".
 *
 * This module classifies inbound email/SMS/LinkedIn/DM replies into the
 * structured outcome set the downstream workflow cares about:
 *
 *   out_of_office    — auto-responder; schedule retry after OOO end date
 *   wrong_person     — not the target contact; try alt channel / enrich
 *   job_change       — person left the company; mark lead as stale
 *   referral         — "talk to Sam in procurement" — create new lead
 *   unsubscribe      — explicit opt-out; honor immediately
 *   interested       — actual signal to progress
 *   not_interested   — soft or hard decline; add to nurture or drop
 *   question         — needs a real response; do not auto-send next step
 *   meeting_request  — wants to book a time; route to scheduling
 *   information      — neutral info-sharing; no action required
 *
 * Deterministic. Pure function. No LLM.
 */

export type ReplyClass =
  | "out_of_office"
  | "wrong_person"
  | "job_change"
  | "referral"
  | "unsubscribe"
  | "interested"
  | "not_interested"
  | "question"
  | "meeting_request"
  | "information"
  | "unknown";

export interface ReplyClassification {
  primary: ReplyClass;
  /** Additional classes detected (a reply can be OOO + job change). */
  secondary: ReplyClass[];
  confidence: number;
  matchedPhrases: string[];
  /** Extracted return date if OOO, ISO or null. */
  oooReturnDate: string | null;
  /** If a referral, the referred contact (raw string). */
  referredTo: string | null;
}

// ---------------------------------------------------------------------------
// Patterns — ordered by severity (first match wins for primary if confidences tie).
// ---------------------------------------------------------------------------

interface ClassPattern {
  cls: ReplyClass;
  pattern: RegExp;
  confidence: number;
}

const PATTERNS: ClassPattern[] = [
  // Unsubscribe — MUST be detected first (legal obligation)
  { cls: "unsubscribe", pattern: /\b(unsubscribe|opt[- ]?out|remove me|take me off|stop emailing me|do not (?:contact|email|call) me|please stop)\b/i, confidence: 0.98 },
  { cls: "unsubscribe", pattern: /\bstop\b(?:\s*$|\s*\.)/i, confidence: 0.85 },

  // Out-of-office
  { cls: "out_of_office", pattern: /\b(?:out of (?:the )?office|on (?:vacation|holiday|leave|pto)|away from (?:my|the) (?:desk|email)|i['’]m (?:away|out))\b/i, confidence: 0.95 },
  { cls: "out_of_office", pattern: /\b(?:auto[- ]?reply|automatic (?:reply|response))\b/i, confidence: 0.9 },
  { cls: "out_of_office", pattern: /\b(?:returning (?:on|to the office)|back (?:on|in the office)|i will (?:return|be back))\b/i, confidence: 0.85 },
  { cls: "out_of_office", pattern: /\blimited (?:access|email)\b/i, confidence: 0.8 },

  // Job change
  { cls: "job_change", pattern: /\bno longer (?:with|at|employed by|working (?:at|for))\b/i, confidence: 0.97 },
  { cls: "job_change", pattern: /\b(?:has )?left the company\b/i, confidence: 0.95 },
  { cls: "job_change", pattern: /\b(?:i have|has) (?:moved on|departed|transitioned)\b/i, confidence: 0.85 },

  // Wrong person
  { cls: "wrong_person", pattern: /\b(?:wrong (?:person|email|number)|you have the wrong|not (?:the|a) (?:right|correct) (?:person|contact))\b/i, confidence: 0.95 },
  { cls: "wrong_person", pattern: /\b(?:i(?:'m| am) not (?:the (?:right|correct|best) person|in charge of))\b/i, confidence: 0.9 },
  { cls: "wrong_person", pattern: /\bi don'?t (?:handle|deal with|own) (?:that|this)\b/i, confidence: 0.8 },

  // Referral
  { cls: "referral", pattern: /\b(?:please )?(?:(?:talk|speak|reach out) to|contact|email)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/, confidence: 0.85 },
  { cls: "referral", pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|would be) (?:the (?:right|best) (?:person|contact)|a better contact)/, confidence: 0.9 },
  { cls: "referral", pattern: /\bforwarding (?:this|your email) to\s+([A-Z][a-z]+)/i, confidence: 0.85 },

  // Meeting request
  { cls: "meeting_request", pattern: /\b(?:let'?s )?(?:set up|book|schedule|find a time for)\s+(?:a )?(?:call|meeting|chat|demo|discussion)\b/i, confidence: 0.9 },
  { cls: "meeting_request", pattern: /\b(?:do you have|are you (?:free|available))\s+(?:time|a few minutes)\b/i, confidence: 0.85 },
  { cls: "meeting_request", pattern: /\b(?:how about|what about)\s+(?:next week|tomorrow|this (?:afternoon|morning|week))\b/i, confidence: 0.75 },
  { cls: "meeting_request", pattern: /\bcalendly\b/i, confidence: 0.85 },

  // Interested
  { cls: "interested", pattern: /\b(?:send (?:me )?(?:more (?:info|details)|pricing|the deck)|tell me more|sounds (?:good|great|interesting)|i(?:'m| am) interested)\b/i, confidence: 0.85 },
  { cls: "interested", pattern: /\b(?:yes[.,!]? (?:please|let'?s|go ahead)|happy to (?:chat|learn more|hear more))\b/i, confidence: 0.85 },

  // Not interested
  { cls: "not_interested", pattern: /\b(?:not (?:interested|a (?:fit|priority))|we'?re (?:all set|good|not (?:in the market|looking))|no thanks?|pass on this)\b/i, confidence: 0.9 },
  { cls: "not_interested", pattern: /\b(?:we (?:already (?:have|use)|just (?:signed|went) with)|we'?re happy with (?:our (?:current )?)?solution)/i, confidence: 0.88 },

  // Question
  { cls: "question", pattern: /\?$/m, confidence: 0.5 },
  { cls: "question", pattern: /\b(?:can you|could you|would you|what (?:is|are|do)|how (?:does|do|much|long)|when|where|why)\b[^?\n]*\?/i, confidence: 0.7 },
];

/**
 * Simple ISO-return-date extractor for OOO replies.
 * Catches "returning Jan 15", "back on 3/17", "returning Monday, January 15".
 */
function parseOooReturnDate(text: string, now: Date = new Date()): string | null {
  // "3/17" or "3/17/2026"
  const slash = text.match(/\b(?:back|return(?:ing)?|in the office)\b[^.]{0,40}?\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
  if (slash) {
    const month = parseInt(slash[1], 10) - 1;
    const day = parseInt(slash[2], 10);
    const yearRaw = slash[3] ? parseInt(slash[3], 10) : null;
    let year = yearRaw ?? now.getFullYear();
    if (yearRaw && yearRaw < 100) year = 2000 + yearRaw;
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day, 12);
      if (!yearRaw && d.getTime() < now.getTime() - 24 * 3600 * 1000) d.setFullYear(year + 1);
      return d.toISOString();
    }
  }
  // "returning January 15"
  const months: Record<string, number> = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
    may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sept: 8, sep: 8,
    october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
  };
  const word = text.match(/\b(?:back|return(?:ing)?)\b[^.]{0,40}?\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept?|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (word) {
    const month = months[word[1].toLowerCase()];
    const day = parseInt(word[2], 10);
    if (month !== undefined && day >= 1 && day <= 31) {
      let year = now.getFullYear();
      const candidate = new Date(year, month, day, 12);
      if (candidate.getTime() < now.getTime() - 24 * 3600 * 1000) year += 1;
      return new Date(year, month, day, 12).toISOString();
    }
  }
  return null;
}

function extractReferredTo(text: string): string | null {
  // Find a capitalized name near "talk to", "contact", "forwarding to"
  const m = text.match(/\b(?:(?:talk|speak|reach out) to|contact|email|forwarding (?:this )?to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (m) return m[1].trim();
  return null;
}

/**
 * Classify an inbound reply.
 */
export function classifyReply(body: string, now: Date = new Date()): ReplyClassification {
  const text = (body ?? "").trim();
  if (!text) {
    return {
      primary: "unknown",
      secondary: [],
      confidence: 0,
      matchedPhrases: [],
      oooReturnDate: null,
      referredTo: null,
    };
  }

  const hits: { cls: ReplyClass; confidence: number; phrase: string }[] = [];
  for (const p of PATTERNS) {
    const m = text.match(p.pattern);
    if (!m) continue;
    hits.push({ cls: p.cls, confidence: p.confidence, phrase: m[0] });
  }

  if (hits.length === 0) {
    return {
      primary: "unknown",
      secondary: [],
      confidence: 0,
      matchedPhrases: [],
      oooReturnDate: null,
      referredTo: null,
    };
  }

  // Dedupe classes — pick highest-confidence match per class
  const byClass = new Map<ReplyClass, { confidence: number; phrases: string[] }>();
  for (const h of hits) {
    const prev = byClass.get(h.cls);
    if (!prev) {
      byClass.set(h.cls, { confidence: h.confidence, phrases: [h.phrase] });
    } else {
      prev.confidence = Math.max(prev.confidence, h.confidence);
      prev.phrases.push(h.phrase);
    }
  }

  // Priority: unsubscribe > job_change > out_of_office > wrong_person > referral
  //         > meeting_request > not_interested > interested > question > information
  const PRIORITY: ReplyClass[] = [
    "unsubscribe",
    "job_change",
    "out_of_office",
    "wrong_person",
    "referral",
    "meeting_request",
    "not_interested",
    "interested",
    "question",
    "information",
  ];

  let primary: ReplyClass | null = null;
  for (const p of PRIORITY) if (byClass.has(p)) { primary = p; break; }
  if (!primary) primary = "unknown";

  const secondary: ReplyClass[] = [];
  for (const p of PRIORITY) if (p !== primary && byClass.has(p)) secondary.push(p);

  const matchedPhrases = Array.from(byClass.values()).flatMap((v) => v.phrases);

  return {
    primary,
    secondary,
    confidence: byClass.get(primary)?.confidence ?? 0,
    matchedPhrases,
    oooReturnDate: primary === "out_of_office" || secondary.includes("out_of_office")
      ? parseOooReturnDate(text, now)
      : null,
    referredTo: primary === "referral" || secondary.includes("referral") ? extractReferredTo(text) : null,
  };
}

/**
 * Suggested next-action given a classification.
 */
export function suggestedNextAction(c: ReplyClassification): {
  action: "suppress" | "requeue_after" | "enrich_and_retry" | "create_referral_lead" | "route_to_scheduling" | "progress_to_next_step" | "human_review" | "no_op";
  notAfter?: string | null;
  note: string;
} {
  switch (c.primary) {
    case "unsubscribe":
      return { action: "suppress", note: "Honor opt-out immediately; do not contact again." };
    case "job_change":
      return { action: "enrich_and_retry", note: "Mark old contact stale; enrich for new role." };
    case "out_of_office":
      return { action: "requeue_after", notAfter: c.oooReturnDate, note: "Wait until OOO end date." };
    case "wrong_person":
      return { action: "enrich_and_retry", note: "Route to correct contact within same account." };
    case "referral":
      return { action: "create_referral_lead", note: `Referred to: ${c.referredTo ?? "unknown"}` };
    case "meeting_request":
      return { action: "route_to_scheduling", note: "Pass to scheduling flow." };
    case "interested":
      return { action: "progress_to_next_step", note: "Advance in cadence; possibly accelerate to human." };
    case "not_interested":
      return { action: "human_review", note: "Soft vs hard no? Consider nurture track." };
    case "question":
      return { action: "human_review", note: "Reply contains a question requiring a real answer." };
    case "information":
    case "unknown":
    default:
      return { action: "no_op", note: "No automated action." };
  }
}
