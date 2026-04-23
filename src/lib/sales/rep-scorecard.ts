/**
 * Phase 21 — Rep scorecards.
 *
 * Combines a rep's activity (calls, emails, SMS, meetings), outcomes
 * (meetings booked, opportunities created, revenue closed), and
 * compliance signals (opt-outs received, bounced emails) into a single
 * 0–100 composite score plus per-dimension breakdown and coaching flags.
 *
 * Designed for managers: "which rep needs coaching this week" and
 * "which rep is on track for quota." Pure — no DB. Callers pass the
 * rollup for a given time window.
 *
 * Scoring weights (tuned to surface both activity AND outcomes):
 *   activity      — 25%  (raw volume, normalized against team median)
 *   quality       — 25%  (connect rate, reply rate, meeting-show rate)
 *   outcomes      — 35%  (meetings booked, opps created, revenue)
 *   compliance    — 15%  (low opt-out rate, low bounce rate, no violations)
 *
 * Coaching flags fire when any single dimension falls below 40.
 */

export interface RepActivityRollup {
  repId: string;
  repName: string;
  /** Window start (ISO). */
  windowStart: string;
  /** Window end (ISO). */
  windowEnd: string;

  // Raw activity counts
  callsPlaced: number;
  callsConnected: number;
  emailsSent: number;
  emailsDelivered: number;
  emailsOpened: number;
  emailsReplied: number;
  emailsBounced: number;
  smsSent: number;
  smsDelivered: number;
  smsReplied: number;

  // Outcomes
  meetingsBooked: number;
  meetingsHeld: number;
  opportunitiesCreated: number;
  opportunitiesWon: number;
  revenueClosed: number;

  // Compliance
  optOutsReceived: number;
  complianceViolations: number;

  // Quota context (optional)
  quotaTarget?: number;
}

export interface TeamBaseline {
  /** Median daily activity (calls + emails + sms) across team. */
  medianDailyActivity: number;
  /** Median meetings booked per rep per window. */
  medianMeetingsBooked: number;
  /** Median revenue closed per rep per window. */
  medianRevenueClosed: number;
}

export interface RepScorecard {
  repId: string;
  repName: string;
  windowStart: string;
  windowEnd: string;
  /** 0–100 overall. */
  compositeScore: number;
  /** Letter grade A/B/C/D/F. */
  grade: "A" | "B" | "C" | "D" | "F";
  dimensions: {
    activity: number;
    quality: number;
    outcomes: number;
    compliance: number;
  };
  /** Human-readable coaching suggestions. */
  coachingFlags: string[];
  /** Computed helper metrics for UI display. */
  metrics: {
    connectRate: number;
    emailReplyRate: number;
    smsReplyRate: number;
    emailBounceRate: number;
    meetingShowRate: number;
    opportunityWinRate: number;
    optOutRate: number;
    activityPerDay: number;
    quotaAttainment: number | null;
  };
}

function daysBetween(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 1;
  return Math.max(1, Math.round((tb - ta) / 86_400_000));
}

function safeDivide(n: number, d: number): number {
  if (d <= 0) return 0;
  return n / d;
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

function scoreActivity(a: RepActivityRollup, team: TeamBaseline): number {
  const days = daysBetween(a.windowStart, a.windowEnd);
  const total = a.callsPlaced + a.emailsSent + a.smsSent;
  const perDay = total / days;
  if (team.medianDailyActivity <= 0) {
    // No baseline — grade on absolute volume (50/day = 100).
    return clamp((perDay / 50) * 100, 0, 100);
  }
  // 1.5× median = 100, 1× = 75, 0.5× = 50, 0× = 0.
  const ratio = perDay / team.medianDailyActivity;
  return clamp(ratio * 66.67, 0, 100);
}

function scoreQuality(a: RepActivityRollup): number {
  // Connect rate = calls connected / calls placed. 30% = excellent.
  const connect = safeDivide(a.callsConnected, a.callsPlaced);
  const connectScore = clamp((connect / 0.3) * 100, 0, 100);
  // Email reply rate = replies / delivered. 8% = excellent.
  const reply = safeDivide(a.emailsReplied, a.emailsDelivered);
  const replyScore = clamp((reply / 0.08) * 100, 0, 100);
  // SMS reply rate = replies / delivered. 20% = excellent.
  const smsReply = safeDivide(a.smsReplied, a.smsDelivered);
  const smsReplyScore = clamp((smsReply / 0.2) * 100, 0, 100);
  // Meeting show rate = held / booked. 80% = excellent.
  const show = safeDivide(a.meetingsHeld, a.meetingsBooked);
  const showScore = clamp((show / 0.8) * 100, 0, 100);

  const signals = [];
  if (a.callsPlaced > 0) signals.push(connectScore);
  if (a.emailsDelivered > 0) signals.push(replyScore);
  if (a.smsDelivered > 0) signals.push(smsReplyScore);
  if (a.meetingsBooked > 0) signals.push(showScore);

  if (signals.length === 0) return 50; // Neutral baseline — insufficient data.
  return signals.reduce((s, v) => s + v, 0) / signals.length;
}

function scoreOutcomes(a: RepActivityRollup, team: TeamBaseline): number {
  // Meetings booked vs team median (2× = 100, 1× = 70).
  const mRatio =
    team.medianMeetingsBooked > 0
      ? a.meetingsBooked / team.medianMeetingsBooked
      : a.meetingsBooked / 5; // 5 = solid baseline
  const meetingsScore = clamp(mRatio * 70, 0, 100);

  // Revenue vs team median.
  const rRatio =
    team.medianRevenueClosed > 0
      ? a.revenueClosed / team.medianRevenueClosed
      : a.revenueClosed / 25000;
  const revenueScore = clamp(rRatio * 70, 0, 100);

  // Opp creation volume (1 per week equivalent = 100).
  const days = daysBetween(a.windowStart, a.windowEnd);
  const oppsPerWeek = (a.opportunitiesCreated / days) * 7;
  const oppsScore = clamp((oppsPerWeek / 1) * 100, 0, 100);

  // Win rate bonus — 30%+ = full credit, 0 = 50.
  const winRate = safeDivide(a.opportunitiesWon, a.opportunitiesCreated);
  const winScore = clamp(50 + winRate * 150, 0, 100);

  return meetingsScore * 0.35 + revenueScore * 0.35 + oppsScore * 0.15 + winScore * 0.15;
}

function scoreCompliance(a: RepActivityRollup): number {
  const touches = a.emailsSent + a.smsSent + a.callsPlaced;
  // Opt-out rate — >2% is a red flag.
  const optOutRate = safeDivide(a.optOutsReceived, touches);
  const optOutPenalty = clamp(optOutRate * 3000, 0, 60);
  // Email bounce rate — >5% gets penalized.
  const bounceRate = safeDivide(a.emailsBounced, a.emailsSent);
  const bouncePenalty = clamp(bounceRate * 800, 0, 40);
  // Hard-stop penalties — each violation is -20 points.
  const violationPenalty = a.complianceViolations * 20;

  return clamp(100 - optOutPenalty - bouncePenalty - violationPenalty, 0, 100);
}

function letterGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function buildCoachingFlags(
  a: RepActivityRollup,
  d: RepScorecard["dimensions"],
  m: RepScorecard["metrics"],
): string[] {
  const flags: string[] = [];
  if (d.activity < 40) flags.push("Activity volume is low — increase daily outreach.");
  if (d.quality < 40) flags.push("Engagement quality is poor — review messaging + targeting.");
  if (d.outcomes < 40) flags.push("Outcomes below team baseline — focus on converting activity to meetings/revenue.");
  if (d.compliance < 40) flags.push("Compliance risk — review send lists and honor opt-outs.");
  if (m.emailBounceRate > 0.05) flags.push("Email bounce rate >5% — clean list and verify addresses.");
  if (m.optOutRate > 0.02) flags.push("Opt-out rate >2% — messaging may be too aggressive or off-target.");
  if (m.connectRate < 0.1 && a.callsPlaced >= 20) flags.push("Call connect rate <10% — try new times or phone quality.");
  if (m.emailReplyRate < 0.02 && a.emailsDelivered >= 50) flags.push("Email reply rate <2% — test new subject lines and hooks.");
  if (m.meetingShowRate < 0.6 && a.meetingsBooked >= 5) flags.push("Meeting no-show rate high — add reminder sequence.");
  if (a.complianceViolations > 0) flags.push(`${a.complianceViolations} compliance violation(s) — escalate to manager.`);
  return flags;
}

export function buildRepScorecard(
  rollup: RepActivityRollup,
  team: TeamBaseline,
): RepScorecard {
  const days = daysBetween(rollup.windowStart, rollup.windowEnd);
  const activity = scoreActivity(rollup, team);
  const quality = scoreQuality(rollup);
  const outcomes = scoreOutcomes(rollup, team);
  const compliance = scoreCompliance(rollup);
  const composite =
    activity * 0.25 + quality * 0.25 + outcomes * 0.35 + compliance * 0.15;

  const totalTouches = rollup.callsPlaced + rollup.emailsSent + rollup.smsSent;

  const metrics = {
    connectRate: safeDivide(rollup.callsConnected, rollup.callsPlaced),
    emailReplyRate: safeDivide(rollup.emailsReplied, rollup.emailsDelivered),
    smsReplyRate: safeDivide(rollup.smsReplied, rollup.smsDelivered),
    emailBounceRate: safeDivide(rollup.emailsBounced, rollup.emailsSent),
    meetingShowRate: safeDivide(rollup.meetingsHeld, rollup.meetingsBooked),
    opportunityWinRate: safeDivide(rollup.opportunitiesWon, rollup.opportunitiesCreated),
    optOutRate: safeDivide(rollup.optOutsReceived, totalTouches),
    activityPerDay: totalTouches / days,
    quotaAttainment:
      rollup.quotaTarget && rollup.quotaTarget > 0
        ? rollup.revenueClosed / rollup.quotaTarget
        : null,
  };

  const dimensions = { activity, quality, outcomes, compliance };
  const coachingFlags = buildCoachingFlags(rollup, dimensions, metrics);

  return {
    repId: rollup.repId,
    repName: rollup.repName,
    windowStart: rollup.windowStart,
    windowEnd: rollup.windowEnd,
    compositeScore: Math.round(composite * 10) / 10,
    grade: letterGrade(composite),
    dimensions: {
      activity: Math.round(activity * 10) / 10,
      quality: Math.round(quality * 10) / 10,
      outcomes: Math.round(outcomes * 10) / 10,
      compliance: Math.round(compliance * 10) / 10,
    },
    coachingFlags,
    metrics,
  };
}

/**
 * Compute team baseline (medians) from a set of rollups. Handy when the
 * caller has all rep data in hand and wants the scorecard to be
 * self-normalizing.
 */
export function computeTeamBaseline(rollups: readonly RepActivityRollup[]): TeamBaseline {
  if (rollups.length === 0) {
    return { medianDailyActivity: 0, medianMeetingsBooked: 0, medianRevenueClosed: 0 };
  }
  const activityPerDay = rollups.map((r) => {
    const days = daysBetween(r.windowStart, r.windowEnd);
    return (r.callsPlaced + r.emailsSent + r.smsSent) / days;
  });
  const meetings = rollups.map((r) => r.meetingsBooked);
  const revenue = rollups.map((r) => r.revenueClosed);
  return {
    medianDailyActivity: median(activityPerDay),
    medianMeetingsBooked: median(meetings),
    medianRevenueClosed: median(revenue),
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}
