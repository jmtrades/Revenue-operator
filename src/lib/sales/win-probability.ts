/**
 * Phase 37 — Deal win-probability predictor.
 *
 * Feature-weighted logistic-style scorer that takes a deal snapshot and
 * emits:
 *   - rawScore      : weighted log-odds sum
 *   - probability   : calibrated 0..1 win likelihood
 *   - confidence    : "low" | "medium" | "high" based on evidence volume
 *   - drivers       : top +/- features contributing to the score
 *   - expectedValue : amount × probability
 *
 * Inputs are a minimal but rich deal snapshot. Pure. No training loop — the
 * weights are hand-tuned against Gong/Outreach public benchmarks but can be
 * overridden per workspace.
 */
import type { DealStage } from "./deal-stall-detector";

export interface WinProbDealSnapshot {
  id: string;
  amount: number;
  stage: DealStage;
  ageDays: number;
  daysSinceLastActivity: number;
  daysToCloseDate: number; // negative = past close date (slipping)
  closeDatePushCount: number;
  stakeholderCount: number;
  championIdentified: boolean;
  economicBuyerEngaged: boolean;
  blockerIdentified: boolean;
  competitorInDeal: boolean;
  mutualActionPlanExists: boolean;
  discountRequestedPct?: number; // 0..1
  icpScore?: number; // 0..100
  intentStrength?: number; // 0..100
  priorStageWinRate?: number; // 0..1 (historical reference for this stage)
  legalEngaged?: boolean;
  procurementEngaged?: boolean;
  salesAcceptedBudget?: boolean;
  poc?: { completed: boolean; passed: boolean } | null;
}

export interface WinProbFeature {
  code: string;
  label: string;
  value: number; // normalized 0..1 (or -1..1 for penalties)
  weight: number; // log-odds contribution
  contribution: number; // value * weight
  direction: "positive" | "negative" | "neutral";
}

export interface WinProbResult {
  dealId: string;
  probability: number;
  rawScore: number;
  stagePrior: number;
  calibrated: boolean;
  confidence: "low" | "medium" | "high";
  features: WinProbFeature[];
  topPositiveDrivers: WinProbFeature[];
  topNegativeDrivers: WinProbFeature[];
  expectedValue: number;
  recommendation: string;
}

/**
 * Empirical stage priors — rough mid-market SaaS benchmarks.
 */
const STAGE_PRIOR: Record<DealStage, number> = {
  prospecting: 0.06,
  discovery: 0.12,
  qualification: 0.2,
  proposal: 0.38,
  negotiation: 0.58,
  verbal_commit: 0.78,
  closed_won: 1,
  closed_lost: 0,
};

const DEFAULT_WEIGHTS = {
  champion: 0.9,
  economicBuyer: 1.1,
  stakeholderBreadth: 0.6,
  mutualPlan: 0.7,
  pocPassed: 1.2,
  pocFailed: -1.5,
  budgetAccepted: 0.8,
  legalEngaged: 0.5,
  procurementEngaged: 0.4,
  icpFit: 0.5,
  intent: 0.4,
  recentActivity: 0.5,
  stalled: -0.9,
  slipping: -0.7,
  pushedMany: -0.6,
  competitor: -0.4,
  blocker: -0.8,
  deepDiscount: -0.5,
  noChampionLateStage: -1.0,
};

function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

function logit(p: number): number {
  const q = clamp(p, 1e-4, 1 - 1e-4);
  return Math.log(q / (1 - q));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function stageRank(s: DealStage): number {
  const ranks: Record<DealStage, number> = {
    prospecting: 0,
    discovery: 1,
    qualification: 2,
    proposal: 3,
    negotiation: 4,
    verbal_commit: 5,
    closed_won: 6,
    closed_lost: 0,
  };
  return ranks[s];
}

/**
 * Feature extractor — turns raw deal snapshot into scored features.
 */
function extractFeatures(
  d: WinProbDealSnapshot,
  w: typeof DEFAULT_WEIGHTS,
): WinProbFeature[] {
  const feats: WinProbFeature[] = [];

  feats.push(featureFromBool("champion", "Champion identified", d.championIdentified, w.champion));
  feats.push(featureFromBool("economic_buyer", "Economic buyer engaged", d.economicBuyerEngaged, w.economicBuyer));

  const stakeholderVal = clamp(d.stakeholderCount / 5); // 5+ stakeholders = saturated
  feats.push({
    code: "stakeholder_breadth",
    label: `${d.stakeholderCount} stakeholders engaged`,
    value: stakeholderVal,
    weight: w.stakeholderBreadth,
    contribution: stakeholderVal * w.stakeholderBreadth,
    direction: stakeholderVal > 0.5 ? "positive" : "neutral",
  });

  feats.push(featureFromBool("mutual_plan", "Mutual action plan in place", d.mutualActionPlanExists, w.mutualPlan));

  if (d.poc) {
    if (d.poc.completed && d.poc.passed) {
      feats.push({
        code: "poc_passed",
        label: "POC completed & passed",
        value: 1,
        weight: w.pocPassed,
        contribution: w.pocPassed,
        direction: "positive",
      });
    } else if (d.poc.completed && !d.poc.passed) {
      feats.push({
        code: "poc_failed",
        label: "POC completed & failed",
        value: 1,
        weight: w.pocFailed,
        contribution: w.pocFailed,
        direction: "negative",
      });
    }
  }

  feats.push(featureFromBool("budget_accepted", "Sales-accepted budget confirmed", d.salesAcceptedBudget ?? false, w.budgetAccepted));
  feats.push(featureFromBool("legal_engaged", "Legal review engaged", d.legalEngaged ?? false, w.legalEngaged));
  feats.push(featureFromBool("procurement_engaged", "Procurement engaged", d.procurementEngaged ?? false, w.procurementEngaged));

  if (d.icpScore !== undefined) {
    const v = clamp(d.icpScore / 100);
    feats.push({
      code: "icp_fit",
      label: `ICP fit ${d.icpScore.toFixed(0)}/100`,
      value: v,
      weight: w.icpFit,
      contribution: v * w.icpFit,
      direction: v >= 0.7 ? "positive" : v >= 0.4 ? "neutral" : "negative",
    });
  }

  if (d.intentStrength !== undefined) {
    const v = clamp(d.intentStrength / 100);
    feats.push({
      code: "intent",
      label: `Intent strength ${d.intentStrength.toFixed(0)}`,
      value: v,
      weight: w.intent,
      contribution: v * w.intent,
      direction: v >= 0.5 ? "positive" : "neutral",
    });
  }

  // Recent activity — half-life 7 days. 0 days = 1.0, 14 days = ~0.25.
  const activityVal = Math.exp(-d.daysSinceLastActivity / 7);
  feats.push({
    code: "recent_activity",
    label: `Last touch ${d.daysSinceLastActivity}d ago`,
    value: activityVal,
    weight: w.recentActivity,
    contribution: activityVal * w.recentActivity,
    direction: activityVal > 0.5 ? "positive" : "negative",
  });

  // Stall penalty — anything >14 days idle.
  if (d.daysSinceLastActivity > 14) {
    const stallSeverity = clamp((d.daysSinceLastActivity - 14) / 30);
    feats.push({
      code: "stalled",
      label: `Stalled ${d.daysSinceLastActivity}d`,
      value: stallSeverity,
      weight: w.stalled,
      contribution: stallSeverity * w.stalled,
      direction: "negative",
    });
  }

  // Slipping close date.
  if (d.daysToCloseDate < 0) {
    const slipSeverity = clamp(Math.abs(d.daysToCloseDate) / 30);
    feats.push({
      code: "slipping",
      label: `${Math.abs(d.daysToCloseDate)}d past close date`,
      value: slipSeverity,
      weight: w.slipping,
      contribution: slipSeverity * w.slipping,
      direction: "negative",
    });
  }

  if (d.closeDatePushCount > 1) {
    const pushSeverity = clamp((d.closeDatePushCount - 1) / 3);
    feats.push({
      code: "pushed_many",
      label: `Close date pushed ${d.closeDatePushCount}×`,
      value: pushSeverity,
      weight: w.pushedMany,
      contribution: pushSeverity * w.pushedMany,
      direction: "negative",
    });
  }

  if (d.competitorInDeal) {
    feats.push({
      code: "competitor",
      label: "Known competitor in deal",
      value: 1,
      weight: w.competitor,
      contribution: w.competitor,
      direction: "negative",
    });
  }

  if (d.blockerIdentified) {
    feats.push({
      code: "blocker",
      label: "Active blocker identified",
      value: 1,
      weight: w.blocker,
      contribution: w.blocker,
      direction: "negative",
    });
  }

  if (d.discountRequestedPct !== undefined && d.discountRequestedPct > 0.2) {
    const discountSev = clamp((d.discountRequestedPct - 0.2) / 0.3);
    feats.push({
      code: "deep_discount",
      label: `Deep discount requested: ${(d.discountRequestedPct * 100).toFixed(0)}%`,
      value: discountSev,
      weight: w.deepDiscount,
      contribution: discountSev * w.deepDiscount,
      direction: "negative",
    });
  }

  // No champion late-stage is specifically bad.
  if (!d.championIdentified && stageRank(d.stage) >= 3) {
    feats.push({
      code: "no_champion_late_stage",
      label: "Past proposal with no identified champion",
      value: 1,
      weight: w.noChampionLateStage,
      contribution: w.noChampionLateStage,
      direction: "negative",
    });
  }

  return feats;
}

function featureFromBool(
  code: string,
  label: string,
  value: boolean,
  weight: number,
): WinProbFeature {
  const v = value ? 1 : 0;
  return {
    code,
    label,
    value: v,
    weight,
    contribution: v * weight,
    direction: value ? (weight >= 0 ? "positive" : "negative") : "neutral",
  };
}

function assessConfidence(d: WinProbDealSnapshot, features: WinProbFeature[]): "low" | "medium" | "high" {
  const informative = features.filter((f) => f.value !== 0).length;
  if (informative >= 7 && d.ageDays >= 14) return "high";
  if (informative >= 4) return "medium";
  return "low";
}

/**
 * Predict win probability.
 */
export function predictWinProbability(
  deal: WinProbDealSnapshot,
  opts: { weights?: Partial<typeof DEFAULT_WEIGHTS>; calibration?: (p: number) => number } = {},
): WinProbResult {
  const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights ?? {}) };

  if (deal.stage === "closed_won") {
    return terminalResult(deal, 1, "Deal already won");
  }
  if (deal.stage === "closed_lost") {
    return terminalResult(deal, 0, "Deal already lost");
  }

  const prior = deal.priorStageWinRate ?? STAGE_PRIOR[deal.stage];
  const features = extractFeatures(deal, weights);
  const logOddsAdjustment = features.reduce((acc, f) => acc + f.contribution, 0);
  const raw = logit(prior) + logOddsAdjustment;
  let probability = sigmoid(raw);
  let calibrated = false;
  if (opts.calibration) {
    probability = clamp(opts.calibration(probability), 0, 1);
    calibrated = true;
  }

  const confidence = assessConfidence(deal, features);

  const sorted = [...features].sort((a, b) => b.contribution - a.contribution);
  const topPositive = sorted.filter((f) => f.contribution > 0).slice(0, 3);
  const topNegative = sorted.filter((f) => f.contribution < 0).slice(-3).reverse();

  const recommendation = buildRecommendation(deal, probability, topNegative, topPositive);

  return {
    dealId: deal.id,
    probability,
    rawScore: raw,
    stagePrior: prior,
    calibrated,
    confidence,
    features,
    topPositiveDrivers: topPositive,
    topNegativeDrivers: topNegative,
    expectedValue: deal.amount * probability,
    recommendation,
  };
}

function buildRecommendation(
  d: WinProbDealSnapshot,
  p: number,
  negatives: WinProbFeature[],
  _positives: WinProbFeature[],
): string {
  if (p >= 0.75) {
    return `Commit-ready — protect runway: confirm ${d.mutualActionPlanExists ? "signature path" : "mutual plan + close steps"}, validate legal/procurement on track.`;
  }
  if (p >= 0.5) {
    const blockers = negatives.map((n) => n.label).slice(0, 2).join("; ") || "momentum";
    return `Likely — accelerate by clearing: ${blockers}.`;
  }
  if (p >= 0.25) {
    return `Coachable — biggest risk: ${negatives[0]?.label ?? "unclear value"}. Schedule champion sync and stakeholder expansion.`;
  }
  return `At risk — ${negatives[0]?.label ?? "insufficient evidence"}. Decide: re-qualify or disqualify this cycle.`;
}

function terminalResult(deal: WinProbDealSnapshot, p: 0 | 1, rec: string): WinProbResult {
  return {
    dealId: deal.id,
    probability: p,
    rawScore: p === 1 ? 99 : -99,
    stagePrior: p,
    calibrated: false,
    confidence: "high",
    features: [],
    topPositiveDrivers: [],
    topNegativeDrivers: [],
    expectedValue: p === 1 ? deal.amount : 0,
    recommendation: rec,
  };
}

/**
 * Isotonic-style monotone calibration from historical (predicted, actual)
 * pairs. Pass the returned fn as opts.calibration.
 */
export function buildIsotonicCalibration(
  pairs: Array<{ predicted: number; actualWon: boolean }>,
): (p: number) => number {
  if (pairs.length < 10) return (p) => p;
  // Bin predictions into 10 buckets and compute empirical win rate.
  const buckets: Array<{ sum: number; n: number; wins: number }> = [];
  for (let i = 0; i < 10; i++) buckets.push({ sum: 0, n: 0, wins: 0 });
  for (const pair of pairs) {
    const idx = Math.min(9, Math.floor(clamp(pair.predicted) * 10));
    buckets[idx].sum += pair.predicted;
    buckets[idx].n += 1;
    if (pair.actualWon) buckets[idx].wins += 1;
  }
  // Smooth: enforce monotonic non-decreasing win rate across buckets.
  const rates: number[] = buckets.map((b) => (b.n === 0 ? NaN : b.wins / b.n));
  // Pool adjacent violators.
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 1; i < rates.length; i++) {
      const r = rates[i];
      const p = rates[i - 1];
      if (!Number.isNaN(r) && !Number.isNaN(p) && r < p) {
        const nL = buckets[i - 1].n;
        const nR = buckets[i].n;
        const merged = (p * nL + r * nR) / (nL + nR);
        rates[i - 1] = merged;
        rates[i] = merged;
        changed = true;
      }
    }
  }
  return (p: number): number => {
    const idx = Math.min(9, Math.floor(clamp(p) * 10));
    const rate = rates[idx];
    return Number.isNaN(rate) ? p : rate;
  };
}

/**
 * Forecast rollup — given a set of deals, produce expected pipeline value.
 */
export function forecastExpectedValue(
  predictions: WinProbResult[],
): {
  total: number;
  byConfidence: Record<"low" | "medium" | "high", { count: number; expected: number; amount: number }>;
  commitReady: WinProbResult[];
} {
  const out: {
    total: number;
    byConfidence: Record<"low" | "medium" | "high", { count: number; expected: number; amount: number }>;
    commitReady: WinProbResult[];
  } = {
    total: 0,
    byConfidence: {
      low: { count: 0, expected: 0, amount: 0 },
      medium: { count: 0, expected: 0, amount: 0 },
      high: { count: 0, expected: 0, amount: 0 },
    },
    commitReady: [],
  };
  for (const p of predictions) {
    out.total += p.expectedValue;
    const bucket = out.byConfidence[p.confidence];
    bucket.count += 1;
    bucket.expected += p.expectedValue;
    bucket.amount += p.expectedValue / Math.max(0.01, p.probability);
    if (p.probability >= 0.75 && p.confidence !== "low") {
      out.commitReady.push(p);
    }
  }
  return out;
}
