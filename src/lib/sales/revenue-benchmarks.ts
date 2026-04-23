/**
 * Phase 47 — Revenue operations benchmarks.
 *
 * Computes conversion rates, sales velocity, stage duration percentiles,
 * segment/ICP hit-rate, cycle length distribution, and period-over-period drift.
 * Pure deterministic functions — no I/O.
 *
 * Core formulas:
 *   winRate       = won / (won + lost)
 *   avgDealSize   = mean(amount | won)
 *   avgCycleDays  = mean(closedAt - createdAt | won)
 *   velocity      = (opps × winRate × avgDealSize) / avgCycleDays   (dollars / day)
 *   stageRate     = opps entering stage Y / opps entering stage X
 *   p25/p50/p75/p90 via linear interpolation
 *   drift_rel     = (curr - prior) / prior
 *   outlier zScore = (x - μ) / σ, flagged when |z| > 2
 */

export type DealOutcome = "won" | "lost" | "open";

export interface DealStageEntry {
  stage: string;
  enteredAtIso: string;
  exitedAtIso?: string;
}

export interface DealSnapshot {
  dealId: string;
  createdAtIso: string;
  closedAtIso?: string;
  outcome: DealOutcome;
  amount: number;
  stage: string;
  segment?: string;
  icpScoreBand?: "A" | "B" | "C" | "D" | "F";
  industry?: string;
  ownerId?: string;
  stageHistory?: DealStageEntry[];
}

export interface BenchmarkInput {
  current: DealSnapshot[];
  prior?: DealSnapshot[];
  /** Reference date for open-deal age calculations. */
  referenceDateIso?: string;
}

export interface PercentileBand {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  n: number;
}

export interface ConversionRate {
  fromStage: string;
  toStage: string;
  count: number;
  denom: number;
  rate: number;
}

export interface StageDurationStats {
  stage: string;
  sample: number;
  meanDays: number;
  percentiles: PercentileBand;
}

export interface VelocityMetrics {
  opportunities: number;
  closedCount: number;
  wonCount: number;
  lostCount: number;
  openCount: number;
  winRate: number;
  avgDealSize: number;
  medianDealSize: number;
  avgCycleDays: number;
  medianCycleDays: number;
  /** $/day */
  velocityPerDay: number;
  /** $/quarter (90d) */
  velocityPerQuarter: number;
}

export interface SegmentBenchmark {
  key: string;
  metrics: VelocityMetrics;
}

export interface BenchmarkDrift {
  metric: string;
  currentValue: number;
  priorValue: number;
  absoluteDelta: number;
  relativeDelta: number;
  direction: "up" | "down" | "flat";
}

export interface OutlierDeal {
  dealId: string;
  metric: "cycleDays" | "dealSize";
  value: number;
  zScore: number;
}

export interface BenchmarkReport {
  overall: VelocityMetrics;
  dealSizeBand: PercentileBand;
  cycleLengthBand: PercentileBand;
  stageDurations: StageDurationStats[];
  conversionRates: ConversionRate[];
  bySegment: SegmentBenchmark[];
  byIcp: SegmentBenchmark[];
  byIndustry: SegmentBenchmark[];
  drift: BenchmarkDrift[];
  outliers: OutlierDeal[];
}

// ---------- primitives ----------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return (b - a) / MS_PER_DAY;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdDev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function band(xs: number[]): PercentileBand {
  return {
    p25: percentile(xs, 0.25),
    p50: percentile(xs, 0.5),
    p75: percentile(xs, 0.75),
    p90: percentile(xs, 0.9),
    n: xs.length,
  };
}

// ---------- velocity metrics ----------

function cycleDaysOf(d: DealSnapshot): number | null {
  if (d.outcome !== "won") return null;
  if (!d.closedAtIso) return null;
  const v = daysBetween(d.createdAtIso, d.closedAtIso);
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

function velocityMetrics(deals: DealSnapshot[]): VelocityMetrics {
  const won = deals.filter((d) => d.outcome === "won");
  const lost = deals.filter((d) => d.outcome === "lost");
  const open = deals.filter((d) => d.outcome === "open");
  const closed = won.length + lost.length;
  const winRate = closed > 0 ? won.length / closed : 0;
  const wonAmounts = won.map((d) => d.amount);
  const avgDealSize = mean(wonAmounts);
  const medianDealSize = percentile(wonAmounts, 0.5);
  const cycleSamples = won.map((d) => cycleDaysOf(d)).filter((n): n is number => n !== null);
  const avgCycleDays = mean(cycleSamples);
  const medianCycleDays = percentile(cycleSamples, 0.5);
  const velocityPerDay = avgCycleDays > 0
    ? (deals.length * winRate * avgDealSize) / avgCycleDays
    : 0;
  return {
    opportunities: deals.length,
    closedCount: closed,
    wonCount: won.length,
    lostCount: lost.length,
    openCount: open.length,
    winRate,
    avgDealSize,
    medianDealSize,
    avgCycleDays,
    medianCycleDays,
    velocityPerDay,
    velocityPerQuarter: velocityPerDay * 90,
  };
}

// ---------- stage durations ----------

function stageDurations(deals: DealSnapshot[]): StageDurationStats[] {
  const perStage: Map<string, number[]> = new Map();
  for (const d of deals) {
    const hist = d.stageHistory ?? [];
    for (const e of hist) {
      if (!e.exitedAtIso) continue;
      const days = daysBetween(e.enteredAtIso, e.exitedAtIso);
      if (!Number.isFinite(days) || days < 0) continue;
      const arr = perStage.get(e.stage) ?? [];
      arr.push(days);
      perStage.set(e.stage, arr);
    }
  }
  const out: StageDurationStats[] = [];
  for (const [stage, arr] of perStage) {
    out.push({
      stage,
      sample: arr.length,
      meanDays: mean(arr),
      percentiles: band(arr),
    });
  }
  out.sort((a, b) => a.stage.localeCompare(b.stage));
  return out;
}

// ---------- conversion rates ----------

function conversionRates(deals: DealSnapshot[]): ConversionRate[] {
  const fromStageCount: Map<string, number> = new Map();
  const edgeCount: Map<string, number> = new Map();
  for (const d of deals) {
    const hist = d.stageHistory ?? [];
    for (let i = 0; i < hist.length; i++) {
      const cur = hist[i];
      fromStageCount.set(cur.stage, (fromStageCount.get(cur.stage) ?? 0) + 1);
      const next = hist[i + 1];
      if (next) {
        const key = `${cur.stage}->${next.stage}`;
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      }
    }
  }
  const out: ConversionRate[] = [];
  for (const [key, count] of edgeCount) {
    const [fromStage, toStage] = key.split("->");
    const denom = fromStageCount.get(fromStage) ?? 0;
    out.push({
      fromStage,
      toStage,
      count,
      denom,
      rate: denom > 0 ? count / denom : 0,
    });
  }
  out.sort((a, b) => a.fromStage.localeCompare(b.fromStage) || b.count - a.count);
  return out;
}

// ---------- segment slices ----------

function sliceVelocity(
  deals: DealSnapshot[],
  getKey: (d: DealSnapshot) => string | undefined,
): SegmentBenchmark[] {
  const groups: Map<string, DealSnapshot[]> = new Map();
  for (const d of deals) {
    const k = getKey(d);
    if (!k) continue;
    const arr = groups.get(k) ?? [];
    arr.push(d);
    groups.set(k, arr);
  }
  const out: SegmentBenchmark[] = [];
  for (const [key, arr] of groups) {
    out.push({ key, metrics: velocityMetrics(arr) });
  }
  out.sort((a, b) => b.metrics.velocityPerDay - a.metrics.velocityPerDay || a.key.localeCompare(b.key));
  return out;
}

// ---------- drift ----------

function driftOf(metric: string, curr: number, prior: number): BenchmarkDrift {
  const absoluteDelta = curr - prior;
  const relativeDelta = prior !== 0 ? absoluteDelta / Math.abs(prior) : curr !== 0 ? Infinity : 0;
  const eps = 0.02;
  const direction = Math.abs(relativeDelta) < eps ? "flat" : relativeDelta > 0 ? "up" : "down";
  return { metric, currentValue: curr, priorValue: prior, absoluteDelta, relativeDelta, direction };
}

function driftReport(current: VelocityMetrics, prior: VelocityMetrics): BenchmarkDrift[] {
  return [
    driftOf("winRate", current.winRate, prior.winRate),
    driftOf("avgDealSize", current.avgDealSize, prior.avgDealSize),
    driftOf("avgCycleDays", current.avgCycleDays, prior.avgCycleDays),
    driftOf("velocityPerDay", current.velocityPerDay, prior.velocityPerDay),
  ];
}

// ---------- outliers ----------

function outlierDeals(deals: DealSnapshot[]): OutlierDeal[] {
  const out: OutlierDeal[] = [];
  const won = deals.filter((d) => d.outcome === "won");
  if (won.length < 3) return out;

  const amounts = won.map((d) => d.amount);
  const amtMean = mean(amounts);
  const amtSd = stdDev(amounts);
  for (const d of won) {
    if (amtSd === 0) break;
    const z = (d.amount - amtMean) / amtSd;
    if (Math.abs(z) > 2) out.push({ dealId: d.dealId, metric: "dealSize", value: d.amount, zScore: z });
  }

  const cycles = won.map((d) => cycleDaysOf(d)).filter((n): n is number => n !== null);
  const cycMean = mean(cycles);
  const cycSd = stdDev(cycles);
  for (const d of won) {
    const c = cycleDaysOf(d);
    if (c === null || cycSd === 0) continue;
    const z = (c - cycMean) / cycSd;
    if (Math.abs(z) > 2) out.push({ dealId: d.dealId, metric: "cycleDays", value: c, zScore: z });
  }

  out.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  return out;
}

// ---------- public entry ----------

export function computeBenchmarks(input: BenchmarkInput): BenchmarkReport {
  const { current, prior = [] } = input;
  const overall = velocityMetrics(current);
  const wonAmounts = current.filter((d) => d.outcome === "won").map((d) => d.amount);
  const wonCycles = current.map((d) => cycleDaysOf(d)).filter((n): n is number => n !== null);

  return {
    overall,
    dealSizeBand: band(wonAmounts),
    cycleLengthBand: band(wonCycles),
    stageDurations: stageDurations(current),
    conversionRates: conversionRates(current),
    bySegment: sliceVelocity(current, (d) => d.segment),
    byIcp: sliceVelocity(current, (d) => d.icpScoreBand),
    byIndustry: sliceVelocity(current, (d) => d.industry),
    drift: prior.length > 0 ? driftReport(overall, velocityMetrics(prior)) : [],
    outliers: outlierDeals(current),
  };
}

// ---------- utility exports ----------

export function percentileOf(xs: number[], p: number): number {
  return percentile(xs, p);
}

export function percentileBand(xs: number[]): PercentileBand {
  return band(xs);
}
