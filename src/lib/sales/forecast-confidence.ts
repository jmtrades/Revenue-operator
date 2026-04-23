/**
 * Phase 38 — Forecast confidence intervals + category rollup.
 *
 * Turns a set of deals (with win probabilities + sales categories) into a
 * statistical forecast that a CFO can actually commit to:
 *
 *   - Expected value with p10/p50/p90 intervals (normal approximation over
 *     independent Bernoulli outcomes).
 *   - Category rollup (commit / best_case / pipeline / omitted).
 *   - Per-rep sandbag + happy-ear deltas: commit category vs. probabilistic
 *     expectation, so managers see which reps are under-calling or
 *     over-calling.
 *
 * Pure. No I/O.
 */
import type { DealStage } from "./deal-stall-detector";

export type ForecastCategory = "commit" | "best_case" | "pipeline" | "omitted";

export interface ForecastDeal {
  id: string;
  ownerId: string;
  amount: number;
  /** 0..1 model-estimated win probability. */
  winProbability: number;
  category: ForecastCategory;
  stage: DealStage;
  closeDate?: string;
}

export interface ForecastInterval {
  /** Σ amount * p. */
  expected: number;
  /** √Σ amount² · p · (1-p). */
  stdDev: number;
  /** 10th percentile (pessimistic case). */
  p10: number;
  /** Median proxy (same as expected for normal approx). */
  p50: number;
  /** 90th percentile (optimistic case). */
  p90: number;
  /** Count of deals included. */
  count: number;
  /** Sum of raw amount (full book). */
  totalAmount: number;
}

export interface CategoryRollup {
  count: number;
  amount: number;
  expected: number;
  avgProbability: number;
}

export interface RepRollup {
  ownerId: string;
  interval: ForecastInterval;
  byCategory: Record<ForecastCategory, CategoryRollup>;
  repCommit: number;
  sandbagScore: number; // 0..1 — suggests deals OUTSIDE commit that should be in
  happyEarScore: number; // 0..1 — suggests deals INSIDE commit that shouldn't be
  sandbagCandidates: Array<{ dealId: string; winProbability: number; amount: number; category: ForecastCategory }>;
  happyEarCandidates: Array<{ dealId: string; winProbability: number; amount: number }>;
  coachNote: string;
}

export interface ForecastRollup {
  period: string;
  total: ForecastInterval;
  byCategory: Record<ForecastCategory, CategoryRollup>;
  byOwner: RepRollup[];
  commitCoverage?: number; // commit / quota
  bestCaseCoverage?: number;
  /** Recommended "call the number" — p50 minus a haircut based on variance. */
  recommendedCallNumber: number;
}

// Z-scores for normal approximation
const Z_10 = 1.2816; // (also p90 mirror)

function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Compute normal-approx forecast interval from Bernoulli deal outcomes.
 * Assumes win outcome = full amount, loss = 0, independent across deals.
 */
export function intervalFromDeals(deals: ForecastDeal[]): ForecastInterval {
  let expected = 0;
  let variance = 0;
  let totalAmount = 0;
  for (const d of deals) {
    const p = clamp(d.winProbability, 0, 1);
    expected += d.amount * p;
    variance += d.amount * d.amount * p * (1 - p);
    totalAmount += d.amount;
  }
  const stdDev = Math.sqrt(variance);
  return {
    expected,
    stdDev,
    p10: Math.max(0, expected - Z_10 * stdDev),
    p50: expected,
    p90: expected + Z_10 * stdDev,
    count: deals.length,
    totalAmount,
  };
}

function emptyCategoryRollup(): Record<ForecastCategory, CategoryRollup> {
  return {
    commit: { count: 0, amount: 0, expected: 0, avgProbability: 0 },
    best_case: { count: 0, amount: 0, expected: 0, avgProbability: 0 },
    pipeline: { count: 0, amount: 0, expected: 0, avgProbability: 0 },
    omitted: { count: 0, amount: 0, expected: 0, avgProbability: 0 },
  };
}

function rollupByCategory(deals: ForecastDeal[]): Record<ForecastCategory, CategoryRollup> {
  const out = emptyCategoryRollup();
  const pSum: Record<ForecastCategory, number> = { commit: 0, best_case: 0, pipeline: 0, omitted: 0 };
  for (const d of deals) {
    const b = out[d.category];
    b.count += 1;
    b.amount += d.amount;
    b.expected += d.amount * clamp(d.winProbability, 0, 1);
    pSum[d.category] += clamp(d.winProbability, 0, 1);
  }
  for (const cat of Object.keys(out) as ForecastCategory[]) {
    const n = out[cat].count;
    out[cat].avgProbability = n === 0 ? 0 : pSum[cat] / n;
  }
  return out;
}

/**
 * Detect sandbag and happy-ear behavior for a single rep.
 *
 * - sandbagScore: deals OUTSIDE commit with p>=0.75 — rep is hiding strong deals.
 * - happyEarScore: deals INSIDE commit with p<=0.55 — rep is over-calling weak deals.
 */
function detectRepBias(deals: ForecastDeal[]): {
  sandbagScore: number;
  happyEarScore: number;
  sandbagCandidates: Array<{ dealId: string; winProbability: number; amount: number; category: ForecastCategory }>;
  happyEarCandidates: Array<{ dealId: string; winProbability: number; amount: number }>;
} {
  const sandbagCandidates: Array<{ dealId: string; winProbability: number; amount: number; category: ForecastCategory }> = [];
  const happyEarCandidates: Array<{ dealId: string; winProbability: number; amount: number }> = [];
  let sandbagWeightedAmt = 0;
  let happyEarWeightedAmt = 0;
  let totalOutsideCommitAmt = 0;
  let totalCommitAmt = 0;

  for (const d of deals) {
    if (d.category === "commit") {
      totalCommitAmt += d.amount;
      if (d.winProbability <= 0.55) {
        const bias = (0.55 - d.winProbability) * 2; // scale 0..~1
        happyEarWeightedAmt += bias * d.amount;
        happyEarCandidates.push({
          dealId: d.id,
          winProbability: d.winProbability,
          amount: d.amount,
        });
      }
    } else if (d.category === "best_case" || d.category === "pipeline") {
      totalOutsideCommitAmt += d.amount;
      if (d.winProbability >= 0.75) {
        const bias = (d.winProbability - 0.75) * 4; // scale 0..1
        sandbagWeightedAmt += bias * d.amount;
        sandbagCandidates.push({
          dealId: d.id,
          winProbability: d.winProbability,
          amount: d.amount,
          category: d.category,
        });
      }
    }
  }

  const sandbagScore = totalOutsideCommitAmt === 0 ? 0 : clamp(sandbagWeightedAmt / totalOutsideCommitAmt);
  const happyEarScore = totalCommitAmt === 0 ? 0 : clamp(happyEarWeightedAmt / totalCommitAmt);

  sandbagCandidates.sort((a, b) => b.winProbability * b.amount - a.winProbability * a.amount);
  happyEarCandidates.sort((a, b) => a.winProbability * a.amount - b.winProbability * b.amount);

  return { sandbagScore, happyEarScore, sandbagCandidates, happyEarCandidates };
}

function buildCoachNote(rep: Omit<RepRollup, "coachNote">): string {
  const sig = (x: number) => x >= 0.3;
  if (sig(rep.sandbagScore) && sig(rep.happyEarScore)) {
    return `Mixed signal: ${rep.sandbagCandidates.length} high-prob deals outside commit AND ${rep.happyEarCandidates.length} weak deals inside commit. Re-sort with rep.`;
  }
  if (sig(rep.sandbagScore)) {
    const top = rep.sandbagCandidates.slice(0, 3).map((c) => c.dealId).join(", ");
    return `Sandbagging likely — consider promoting: ${top}.`;
  }
  if (sig(rep.happyEarScore)) {
    const top = rep.happyEarCandidates.slice(0, 3).map((c) => c.dealId).join(", ");
    return `Happy-ear risk — validate these commit deals: ${top}.`;
  }
  return `Call matches model expectation. Keep current forecast.`;
}

/**
 * Full period rollup.
 */
export function forecastPeriod(
  deals: ForecastDeal[],
  options: { period: string; quotasByOwner?: Record<string, number> } = { period: "unknown" },
): ForecastRollup {
  const byOwnerMap = new Map<string, ForecastDeal[]>();
  for (const d of deals) {
    if (!byOwnerMap.has(d.ownerId)) byOwnerMap.set(d.ownerId, []);
    byOwnerMap.get(d.ownerId)!.push(d);
  }

  const byOwner: RepRollup[] = [];
  for (const [ownerId, ownerDeals] of byOwnerMap) {
    const bias = detectRepBias(ownerDeals);
    const partial: Omit<RepRollup, "coachNote"> = {
      ownerId,
      interval: intervalFromDeals(ownerDeals),
      byCategory: rollupByCategory(ownerDeals),
      repCommit: ownerDeals.filter((d) => d.category === "commit").reduce((a, b) => a + b.amount, 0),
      sandbagScore: bias.sandbagScore,
      happyEarScore: bias.happyEarScore,
      sandbagCandidates: bias.sandbagCandidates,
      happyEarCandidates: bias.happyEarCandidates,
    };
    byOwner.push({ ...partial, coachNote: buildCoachNote(partial) });
  }

  const nonOmitted = deals.filter((d) => d.category !== "omitted");
  const total = intervalFromDeals(nonOmitted);
  const totalByCategory = rollupByCategory(deals);

  let commitCoverage: number | undefined;
  let bestCaseCoverage: number | undefined;
  if (options.quotasByOwner) {
    const totalQuota = Object.values(options.quotasByOwner).reduce((a, b) => a + b, 0);
    if (totalQuota > 0) {
      commitCoverage = totalByCategory.commit.amount / totalQuota;
      bestCaseCoverage = (totalByCategory.commit.amount + totalByCategory.best_case.amount) / totalQuota;
    }
  }

  // Recommended call: midpoint of (commit total) and (p50 expected), leaning toward p10 if stdDev/expected > 0.3.
  const cv = total.expected === 0 ? 0 : total.stdDev / total.expected;
  const call = cv > 0.3
    ? Math.max(totalByCategory.commit.expected, total.p10 * 0.9 + total.expected * 0.1)
    : Math.max(totalByCategory.commit.expected, total.p10 * 0.5 + total.expected * 0.5);

  return {
    period: options.period,
    total,
    byCategory: totalByCategory,
    byOwner: byOwner.sort((a, b) => b.interval.expected - a.interval.expected),
    commitCoverage,
    bestCaseCoverage,
    recommendedCallNumber: Math.round(call),
  };
}

/**
 * Simulate N outcomes by drawing Bernoulli(p_i) per deal — useful to produce
 * empirical CIs when the normal approx is unreliable (small book).
 */
export function simulateForecast(
  deals: ForecastDeal[],
  trials = 1000,
  rng: () => number = Math.random,
): { mean: number; p10: number; p50: number; p90: number; samples: number[] } {
  const samples: number[] = [];
  for (let t = 0; t < trials; t++) {
    let s = 0;
    for (const d of deals) {
      if (rng() < d.winProbability) s += d.amount;
    }
    samples.push(s);
  }
  samples.sort((a, b) => a - b);
  const at = (q: number) => samples[Math.min(samples.length - 1, Math.floor(q * samples.length))];
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { mean, p10: at(0.1), p50: at(0.5), p90: at(0.9), samples };
}
