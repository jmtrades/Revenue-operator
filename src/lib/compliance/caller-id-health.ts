/**
 * Phase 12c.11 — Caller-ID / spam reputation health.
 *
 * Research gap (Phase 12a): multi-line dialers (PhoneBurner, Orum, Nooks)
 * give you dozens of numbers but almost none monitor per-number spam
 * reputation in flight. Reps dial a number until answer rate collapses,
 * then "notice" it's burnt — weeks later. By then, Hiya/TNS/First Orion
 * have labelled it "Spam Likely" and it's effectively useless.
 *
 * This module:
 *   1. Accepts a rolling window of call outcomes for a given number.
 *   2. Computes health signals: answer rate, voicemail-rate spike,
 *      short-call rate (answered <10s = hang-up), complaint rate,
 *      per-day volume vs. carrier soft limits.
 *   3. Emits a verdict: healthy | at_risk | burning | burnt.
 *   4. Suggests next action: keep | reduce_volume | rotate | retire.
 *
 * Pure function. Deterministic. Consumes metrics; caller persists them.
 *
 * Note: actual external reputation lookups (Hiya Connect, Numeracle, etc.)
 * are intentionally out of scope — this is the _internal_ health signal
 * that can run 24/7 without vendor dependency. The two layer together.
 */

export interface CallOutcomeWindow {
  /** Number under test in E.164. */
  phoneNumber: string;
  /** Start ISO of the window. */
  windowStartIso: string;
  /** End ISO of the window. */
  windowEndIso: string;
  /** Number of outbound call attempts in window. */
  attempts: number;
  /** Number answered by a human. */
  humanAnswered: number;
  /** Calls that went to voicemail / AMD. */
  voicemail: number;
  /** Calls that connected but were <10s before the callee hung up. */
  quickHangups: number;
  /** Calls that returned carrier spam/block indicators (SIP 607/608, user busy after one ring, etc.). */
  blockIndicators: number;
  /** Explicit consumer complaints or DNC-add events attributed to this number. */
  complaints: number;
  /** Calls that led to a positive outcome (booked, interested, connected to DM). */
  positiveOutcomes: number;
  /** Optional: the baseline answer rate across healthy numbers in same geography (for comparison). */
  fleetBaselineAnswerRate?: number;
}

export type CallerIdVerdict = "healthy" | "at_risk" | "burning" | "burnt";

export interface CallerIdHealth {
  phoneNumber: string;
  verdict: CallerIdVerdict;
  /** 0 (burnt) ... 1 (pristine). */
  healthScore: number;
  signals: CallerIdSignal[];
  /** Next action the dialer should take with this number. */
  recommendation: CallerIdRecommendation;
  computedAtIso: string;
}

export interface CallerIdSignal {
  name: string;
  value: number;
  threshold: number;
  tripped: boolean;
  weight: number;
}

export type CallerIdRecommendation =
  | { action: "keep" }
  | { action: "reduce_volume"; targetCallsPerDay: number }
  | { action: "rotate"; coolDownHours: number }
  | { action: "retire" };

// ---------------------------------------------------------------------------
// Thresholds — conservative, tunable.
// ---------------------------------------------------------------------------

const THRESHOLDS = {
  /** Answer rate below which we start worrying. */
  answerRateWarn: 0.15,
  answerRateBurning: 0.08,
  answerRateBurnt: 0.04,

  /** Voicemail rate above which reputation is likely degraded. */
  voicemailRateWarn: 0.6,
  voicemailRateBurning: 0.75,

  /** Short hangups / connected — callee saw "Spam Likely", hung up. */
  quickHangupRateWarn: 0.25,
  quickHangupRateBurning: 0.4,

  /** Carrier block indicators (rare but decisive). */
  blockIndicatorWarn: 0.02,
  blockIndicatorBurning: 0.05,

  /** Complaint count per 1000 attempts (FCC-style). */
  complaintRateWarn: 0.5 / 1000,
  complaintRateBurning: 1.0 / 1000,

  /** Max calls per day per number before carrier soft-limit risk. */
  dailyVolumeSoftLimit: 75,
};

/**
 * Compute health signals for a given window.
 *
 * The caller is responsible for bucketing calls into windows (per-hour,
 * per-day, 24h rolling, whatever fits their dashboard). A 6–24h window
 * is a good default.
 */
export function computeCallerIdHealth(w: CallOutcomeWindow): CallerIdHealth {
  const attempts = Math.max(0, w.attempts);
  const connected = w.humanAnswered + w.quickHangups;

  const answerRate = attempts > 0 ? w.humanAnswered / attempts : 0;
  const vmRate = attempts > 0 ? w.voicemail / attempts : 0;
  const qhRate = connected > 0 ? w.quickHangups / connected : 0;
  const blockRate = attempts > 0 ? w.blockIndicators / attempts : 0;
  const complaintRate = attempts > 0 ? w.complaints / attempts : 0;

  const signals: CallerIdSignal[] = [
    {
      name: "answer_rate_low",
      value: answerRate,
      threshold: THRESHOLDS.answerRateWarn,
      tripped: attempts >= 10 && answerRate < THRESHOLDS.answerRateWarn,
      weight: 0.35,
    },
    {
      name: "voicemail_rate_high",
      value: vmRate,
      threshold: THRESHOLDS.voicemailRateWarn,
      tripped: attempts >= 10 && vmRate > THRESHOLDS.voicemailRateWarn,
      weight: 0.15,
    },
    {
      name: "quick_hangup_rate_high",
      value: qhRate,
      threshold: THRESHOLDS.quickHangupRateWarn,
      tripped: connected >= 10 && qhRate > THRESHOLDS.quickHangupRateWarn,
      weight: 0.2,
    },
    {
      name: "carrier_block_indicators",
      value: blockRate,
      threshold: THRESHOLDS.blockIndicatorWarn,
      tripped: attempts >= 10 && blockRate > THRESHOLDS.blockIndicatorWarn,
      weight: 0.2,
    },
    {
      name: "complaint_rate",
      value: complaintRate,
      threshold: THRESHOLDS.complaintRateWarn,
      tripped: complaintRate > THRESHOLDS.complaintRateWarn,
      weight: 0.1,
    },
  ];

  // Score: start at 1.0 (pristine), subtract weighted tripped signals.
  // Apply steeper penalty for burning-level breaches.
  let score = 1;
  for (const s of signals) {
    if (!s.tripped) continue;
    score -= s.weight;
  }
  if (answerRate < THRESHOLDS.answerRateBurning) score -= 0.2;
  if (answerRate < THRESHOLDS.answerRateBurnt) score -= 0.2;
  if (blockRate > THRESHOLDS.blockIndicatorBurning) score -= 0.25;
  if (qhRate > THRESHOLDS.quickHangupRateBurning) score -= 0.15;
  if (complaintRate > THRESHOLDS.complaintRateBurning) score -= 0.25;

  // Fleet-baseline adjustment: heavy penalty if we're materially below peers.
  if (w.fleetBaselineAnswerRate && attempts >= 20) {
    const gap = w.fleetBaselineAnswerRate - answerRate;
    if (gap > 0.1) score -= Math.min(0.2, gap);
  }

  score = Math.max(0, Math.min(1, score));

  const verdict: CallerIdVerdict =
    score >= 0.8 ? "healthy" :
    score >= 0.55 ? "at_risk" :
    score >= 0.3 ? "burning" :
    "burnt";

  const recommendation = recommendAction(verdict, attempts);

  return {
    phoneNumber: w.phoneNumber,
    verdict,
    healthScore: Number(score.toFixed(2)),
    signals,
    recommendation,
    computedAtIso: new Date().toISOString(),
  };
}

function recommendAction(verdict: CallerIdVerdict, attempts: number): CallerIdRecommendation {
  switch (verdict) {
    case "healthy":
      return { action: "keep" };
    case "at_risk":
      // Cut volume ~40%, stay active but test the water
      return {
        action: "reduce_volume",
        targetCallsPerDay: Math.max(25, Math.floor(Math.min(attempts, THRESHOLDS.dailyVolumeSoftLimit) * 0.6)),
      };
    case "burning":
      return { action: "rotate", coolDownHours: 72 };
    case "burnt":
    default:
      return { action: "retire" };
  }
}

/**
 * Convenience: aggregate a fleet of numbers' health into per-tier counts.
 */
export function summariseFleet(healths: CallerIdHealth[]): {
  healthy: number;
  at_risk: number;
  burning: number;
  burnt: number;
  averageScore: number;
} {
  if (healths.length === 0) {
    return { healthy: 0, at_risk: 0, burning: 0, burnt: 0, averageScore: 0 };
  }
  const counts = { healthy: 0, at_risk: 0, burning: 0, burnt: 0 };
  let sum = 0;
  for (const h of healths) {
    counts[h.verdict] += 1;
    sum += h.healthScore;
  }
  return {
    ...counts,
    averageScore: Number((sum / healths.length).toFixed(2)),
  };
}
