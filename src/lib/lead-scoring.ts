/**
 * Lead scoring: 0–100 from call/event signals.
 * Recalculate on each new call or event; store in leads.score or metadata.score.
 */

export interface LeadScoringEvent {
  type: "call" | "sms" | "note" | "stage_change";
  /** Call duration in seconds */
  durationSeconds?: number;
  sentiment?: "positive" | "neutral" | "negative";
  /** Asked about pricing */
  pricingQuestion?: boolean;
  /** Outcome: booked appointment */
  booked?: boolean;
  /** Return caller (had prior contact) */
  returnCaller?: boolean;
  /** "Just browsing" or low intent */
  justBrowsing?: boolean;
}

const SCORE_DELTAS = {
  callCount: 10,
  durationOver2Min: 15,
  positiveSentiment: 20,
  pricingQuestion: 15,
  booked: 25,
  returnCaller: 20,
  negativeSentiment: -15,
  justBrowsing: -10,
} as const;

const MIN_SCORE = 0;
const MAX_SCORE = 100;

/**
 * Compute lead score from a list of events (e.g. calls, SMS, notes).
 * Clamps to 0–100.
 */
export function calculateLeadScore(events: LeadScoringEvent[]): number {
  let score = 50; // base

  for (const e of events) {
    if (e.type === "call") {
      score += SCORE_DELTAS.callCount;
      if ((e.durationSeconds ?? 0) > 120) score += SCORE_DELTAS.durationOver2Min;
      if (e.sentiment === "positive") score += SCORE_DELTAS.positiveSentiment;
      if (e.sentiment === "negative") score += SCORE_DELTAS.negativeSentiment;
      if (e.pricingQuestion) score += SCORE_DELTAS.pricingQuestion;
      if (e.booked) score += SCORE_DELTAS.booked;
      if (e.returnCaller) score += SCORE_DELTAS.returnCaller;
      if (e.justBrowsing) score += SCORE_DELTAS.justBrowsing;
    }
  }

  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));
}

/**
 * Build a single event from call session data for scoring.
 */
export function eventFromCall(params: {
  durationSeconds?: number;
  sentiment?: "positive" | "neutral" | "negative";
  outcome?: string | null;
  summary?: string | null;
  isReturnCaller?: boolean;
}): LeadScoringEvent {
  const summary = (params.summary ?? "").toLowerCase();
  return {
    type: "call",
    durationSeconds: params.durationSeconds,
    sentiment: params.sentiment ?? "neutral",
    pricingQuestion: /price|pricing|cost|how much|quote/.test(summary),
    booked: params.outcome === "appointment" || /booked|appointment|scheduled/.test(summary),
    returnCaller: params.isReturnCaller,
    justBrowsing: /just looking|browsing|not interested|just checking/.test(summary),
  };
}
