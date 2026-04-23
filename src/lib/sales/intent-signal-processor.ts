/**
 * Phase 39 — Intent + buying signal processor.
 *
 * Consumes a feed of heterogeneous buying signals (job change, funding,
 * hiring, product-usage, web intent, event attendance, tech-install change)
 * and produces:
 *
 *   - Per-account aggregated intent score (time-decayed).
 *   - Ranked signal types (which signals move the needle most).
 *   - Recommended play: "launch outbound", "expand cadence", "watch".
 *   - A structured timeline event list so reps see *why* the score moved.
 *
 * Uses exponential decay: score = Σ weight_i × strength_i × e^(-Δt/halfLife)
 * where halfLife defaults per signal type (funding decays slower than a
 * single web visit).
 *
 * Pure. Caller is responsible for sourcing signals.
 */

export type SignalType =
  | "funding_round"
  | "leadership_change"
  | "hiring_spike"
  | "job_posting_keyword"
  | "tech_install"
  | "tech_uninstall"
  | "web_research"
  | "pricing_page_visit"
  | "competitor_comparison"
  | "case_study_view"
  | "product_usage_up"
  | "product_usage_down"
  | "webinar_attended"
  | "review_posted"
  | "social_engagement"
  | "event_registered"
  | "content_download"
  | "inbound_form_fill"
  | "email_engagement"
  | "custom";

export interface BuyingSignal {
  id: string;
  accountId: string;
  type: SignalType;
  /** 1..5 raw strength (e.g., 1 page view vs 5 pricing-page sessions). */
  strength: number;
  occurredAt: string; // ISO
  /** Optional metadata (topic, persona, source). */
  topic?: string;
  source?: string;
  detail?: string;
}

export interface IntentWeightConfig {
  /** Base weight per signal type (higher = more meaningful). */
  weights: Record<SignalType, number>;
  /** Half-life in days per signal type. */
  halfLifeDays: Record<SignalType, number>;
  /** Topics that carry extra multiplier when present. */
  priorityTopicMultiplier: number;
  priorityTopics: string[];
}

export const DEFAULT_INTENT_CONFIG: IntentWeightConfig = {
  weights: {
    funding_round: 9,
    leadership_change: 7,
    hiring_spike: 6,
    job_posting_keyword: 5,
    tech_install: 8,
    tech_uninstall: 7,
    web_research: 3,
    pricing_page_visit: 6,
    competitor_comparison: 7,
    case_study_view: 4,
    product_usage_up: 5,
    product_usage_down: 6, // churn-warn
    webinar_attended: 4,
    review_posted: 3,
    social_engagement: 2,
    event_registered: 4,
    content_download: 3,
    inbound_form_fill: 9,
    email_engagement: 2,
    custom: 3,
  },
  halfLifeDays: {
    funding_round: 180,
    leadership_change: 120,
    hiring_spike: 60,
    job_posting_keyword: 45,
    tech_install: 120,
    tech_uninstall: 120,
    web_research: 14,
    pricing_page_visit: 14,
    competitor_comparison: 14,
    case_study_view: 14,
    product_usage_up: 30,
    product_usage_down: 30,
    webinar_attended: 30,
    review_posted: 60,
    social_engagement: 7,
    event_registered: 45,
    content_download: 21,
    inbound_form_fill: 30,
    email_engagement: 7,
    custom: 30,
  },
  priorityTopicMultiplier: 1.5,
  priorityTopics: [],
};

export interface AccountIntentScore {
  accountId: string;
  score: number; // 0..100
  raw: number; // unclamped decayed sum
  trend: "rising" | "steady" | "cooling";
  topSignals: Array<{ type: SignalType; contribution: number; detail?: string; occurredAt: string }>;
  signalCountsByType: Partial<Record<SignalType, number>>;
  recommendedPlay:
    | "launch_outbound"
    | "accelerate_sequence"
    | "warm_watch"
    | "cold_watch"
    | "churn_alert";
  recentEventCount: number;
  lastEventAt: string | null;
}

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function decayContribution(
  s: BuyingSignal,
  cfg: IntentWeightConfig,
  nowIso: string,
): number {
  const weight = cfg.weights[s.type] ?? cfg.weights.custom;
  const halfLife = cfg.halfLifeDays[s.type] ?? cfg.halfLifeDays.custom;
  const age = daysBetween(s.occurredAt, nowIso);
  if (age < 0) return 0; // future signal — ignore
  const decay = Math.pow(0.5, age / halfLife);
  const priorityMult =
    s.topic && cfg.priorityTopics.map((t) => t.toLowerCase()).includes(s.topic.toLowerCase())
      ? cfg.priorityTopicMultiplier
      : 1;
  return weight * Math.max(1, s.strength) * decay * priorityMult;
}

function decideTrend(signals: BuyingSignal[], nowIso: string): "rising" | "steady" | "cooling" {
  if (signals.length === 0) return "cooling";
  const ts = signals.map((s) => daysBetween(s.occurredAt, nowIso));
  const last14 = ts.filter((d) => d <= 14).length;
  const prev14 = ts.filter((d) => d > 14 && d <= 28).length;
  if (last14 > prev14 * 1.25 && last14 >= 2) return "rising";
  if (last14 < prev14 * 0.6) return "cooling";
  return "steady";
}

function decidePlay(
  raw: number,
  trend: "rising" | "steady" | "cooling",
  signals: BuyingSignal[],
): AccountIntentScore["recommendedPlay"] {
  const hasChurnWarn = signals.some((s) => s.type === "product_usage_down");
  if (hasChurnWarn && raw >= 10) return "churn_alert";
  if (raw >= 40 && trend === "rising") return "launch_outbound";
  if (raw >= 25) return "accelerate_sequence";
  if (raw >= 8) return "warm_watch";
  return "cold_watch";
}

/**
 * Score a single account given its signal feed.
 */
export function scoreAccountIntent(
  accountId: string,
  signals: BuyingSignal[],
  nowIso: string,
  cfg: IntentWeightConfig = DEFAULT_INTENT_CONFIG,
): AccountIntentScore {
  const own = signals.filter((s) => s.accountId === accountId);
  const contribs = own.map((s) => ({
    signal: s,
    value: decayContribution(s, cfg, nowIso),
  }));
  const raw = contribs.reduce((acc, c) => acc + c.value, 0);
  const score = Math.min(100, Math.round(raw));
  const counts: Partial<Record<SignalType, number>> = {};
  for (const c of contribs) counts[c.signal.type] = (counts[c.signal.type] ?? 0) + 1;

  const top = [...contribs]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((c) => ({
      type: c.signal.type,
      contribution: c.value,
      detail: c.signal.detail,
      occurredAt: c.signal.occurredAt,
    }));

  const trend = decideTrend(own, nowIso);
  const play = decidePlay(raw, trend, own);
  const recent = own.filter((s) => daysBetween(s.occurredAt, nowIso) <= 30).length;
  const lastEventAt = own.length === 0
    ? null
    : own.reduce((latest, s) => (s.occurredAt > latest ? s.occurredAt : latest), own[0].occurredAt);

  return {
    accountId,
    score,
    raw,
    trend,
    topSignals: top,
    signalCountsByType: counts,
    recommendedPlay: play,
    recentEventCount: recent,
    lastEventAt,
  };
}

/**
 * Batch score a feed across accounts.
 */
export function scoreBookIntent(
  signals: BuyingSignal[],
  nowIso: string,
  cfg: IntentWeightConfig = DEFAULT_INTENT_CONFIG,
): AccountIntentScore[] {
  const byAcct = new Map<string, BuyingSignal[]>();
  for (const s of signals) {
    if (!byAcct.has(s.accountId)) byAcct.set(s.accountId, []);
    byAcct.get(s.accountId)!.push(s);
  }
  const out: AccountIntentScore[] = [];
  for (const [acct, sigs] of byAcct) {
    out.push(scoreAccountIntent(acct, sigs, nowIso, cfg));
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Promote signals above a threshold into "spike" alerts — used by alerting
 * pipelines to notify AEs when an account just crossed a threshold.
 */
export function detectSpikes(
  priorScores: AccountIntentScore[],
  currentScores: AccountIntentScore[],
  deltaThreshold = 15,
): Array<{
  accountId: string;
  prior: number;
  current: number;
  delta: number;
  play: AccountIntentScore["recommendedPlay"];
}> {
  const priorMap = new Map(priorScores.map((s) => [s.accountId, s.score]));
  const out: Array<{ accountId: string; prior: number; current: number; delta: number; play: AccountIntentScore["recommendedPlay"] }> = [];
  for (const cur of currentScores) {
    const prior = priorMap.get(cur.accountId) ?? 0;
    const delta = cur.score - prior;
    if (delta >= deltaThreshold) {
      out.push({ accountId: cur.accountId, prior, current: cur.score, delta, play: cur.recommendedPlay });
    }
  }
  return out.sort((a, b) => b.delta - a.delta);
}
