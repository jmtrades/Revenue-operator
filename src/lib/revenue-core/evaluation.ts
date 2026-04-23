/**
 * Revenue-core evaluation harness.
 *
 * Standalone, deterministic, pure functions for scoring probability models
 * (win probability, churn, forecast confidence). Everything here operates on
 * pre-collected labeled examples — there is no I/O, no HTTP, no DB. You
 * hand it predictions + truth, it hands back metrics and diagnostic curves.
 *
 * Design goals:
 *   1. Any upstream model can be scored — black-box, logistic, kernel, RNN.
 *   2. All metrics are stable under shuffling of inputs (we sort internally
 *      where order matters).
 *   3. No dependency on chart libraries — curves are returned as data.
 *   4. Every metric is unit-tested against a hand-computed reference.
 */

// -----------------------------------------------------------------------------
// Core data types
// -----------------------------------------------------------------------------

export interface LabeledPrediction {
  /** Model-predicted probability of the positive class ∈ [0,1]. */
  readonly pHat: number;
  /** Ground truth outcome: 1 for positive, 0 for negative. */
  readonly y: 0 | 1;
  /** Optional sample weight (default 1). */
  readonly weight?: number;
  /** Optional opaque id for debugging / export. */
  readonly id?: string;
}

export interface CalibrationBucket {
  readonly lower: number;
  readonly upper: number;
  readonly n: number;
  readonly meanPredicted: number;
  readonly meanActual: number;
  /** meanPredicted - meanActual; positive = model over-confident. */
  readonly gap: number;
}

export interface CalibrationReport {
  readonly bucketCount: number;
  readonly buckets: ReadonlyArray<CalibrationBucket>;
  /** Expected Calibration Error: Σ (n_i / N) * |gap_i|. Lower is better. */
  readonly ece: number;
  /** Max Calibration Error: max_i |gap_i|. Lower is better. */
  readonly mce: number;
  /** Convenience: did the model over-predict on average? */
  readonly systematicBias: number;
}

export interface ClassificationMetrics {
  readonly n: number;
  readonly positives: number;
  readonly negatives: number;
  /** Brier = (1/N) Σ (p_i - y_i)^2. Lower is better, bounded [0,1]. */
  readonly brier: number;
  /** Log loss = -(1/N) Σ [y log p + (1-y) log (1-p)], clipped. */
  readonly logLoss: number;
  /** Accuracy at the supplied decision threshold. */
  readonly accuracy: number;
  /** Precision = TP/(TP+FP). NaN-guarded to 0. */
  readonly precision: number;
  /** Recall = TP/(TP+FN). NaN-guarded to 0. */
  readonly recall: number;
  /** F1. NaN-guarded to 0. */
  readonly f1: number;
  /** AUROC via rank-based Mann-Whitney U (handles ties). */
  readonly auroc: number;
  /** Average precision under the PR curve (trapezoidal). */
  readonly avgPrecision: number;
}

export interface RocPoint {
  readonly threshold: number;
  readonly fpr: number;
  readonly tpr: number;
}

export interface PrPoint {
  readonly threshold: number;
  readonly precision: number;
  readonly recall: number;
}

// -----------------------------------------------------------------------------
// Small utilities
// -----------------------------------------------------------------------------

function clip(p: number, eps = 1e-12): number {
  if (!Number.isFinite(p)) return eps;
  if (p < eps) return eps;
  if (p > 1 - eps) return 1 - eps;
  return p;
}

function weightOf(r: LabeledPrediction): number {
  if (r.weight == null) return 1;
  if (!Number.isFinite(r.weight) || r.weight < 0) return 0;
  return r.weight;
}

function assertNonEmpty(
  rows: ReadonlyArray<LabeledPrediction>,
  fn: string,
): void {
  if (rows.length === 0) throw new Error(`${fn}: input is empty`);
}

// -----------------------------------------------------------------------------
// Calibration
// -----------------------------------------------------------------------------

/**
 * Equal-width calibration buckets on [0,1]. Bucket `i` covers
 * [i/B, (i+1)/B), except the last bucket which is closed on both sides so
 * `pHat === 1` lands somewhere. Empty buckets are omitted from the output
 * but counted toward `bucketCount`.
 */
export function calibrationReport(
  predictions: ReadonlyArray<LabeledPrediction>,
  bucketCount = 10,
): CalibrationReport {
  assertNonEmpty(predictions, "calibrationReport");
  if (bucketCount < 1) throw new Error("calibrationReport: bucketCount < 1");

  const bins: Array<{
    sumP: number;
    sumY: number;
    sumW: number;
    lower: number;
    upper: number;
  }> = [];
  for (let i = 0; i < bucketCount; i++) {
    bins.push({
      sumP: 0,
      sumY: 0,
      sumW: 0,
      lower: i / bucketCount,
      upper: (i + 1) / bucketCount,
    });
  }

  for (const row of predictions) {
    const w = weightOf(row);
    if (w === 0) continue;
    const p = Math.max(0, Math.min(1, row.pHat));
    let idx = Math.floor(p * bucketCount);
    if (idx >= bucketCount) idx = bucketCount - 1;
    bins[idx].sumP += p * w;
    bins[idx].sumY += row.y * w;
    bins[idx].sumW += w;
  }

  const totalW = bins.reduce((s, b) => s + b.sumW, 0);
  let ece = 0;
  let mce = 0;
  let biasTotal = 0;
  const buckets: CalibrationBucket[] = [];
  for (const b of bins) {
    if (b.sumW === 0) continue;
    const meanPredicted = b.sumP / b.sumW;
    const meanActual = b.sumY / b.sumW;
    const gap = meanPredicted - meanActual;
    ece += (b.sumW / totalW) * Math.abs(gap);
    mce = Math.max(mce, Math.abs(gap));
    biasTotal += b.sumW * gap;
    buckets.push({
      lower: b.lower,
      upper: b.upper,
      n: b.sumW,
      meanPredicted,
      meanActual,
      gap,
    });
  }

  return {
    bucketCount,
    buckets,
    ece,
    mce,
    systematicBias: biasTotal / totalW,
  };
}

// -----------------------------------------------------------------------------
// Classification metrics
// -----------------------------------------------------------------------------

export function brier(predictions: ReadonlyArray<LabeledPrediction>): number {
  assertNonEmpty(predictions, "brier");
  let num = 0;
  let den = 0;
  for (const r of predictions) {
    const w = weightOf(r);
    const diff = r.pHat - r.y;
    num += w * diff * diff;
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

export function logLoss(predictions: ReadonlyArray<LabeledPrediction>): number {
  assertNonEmpty(predictions, "logLoss");
  let num = 0;
  let den = 0;
  for (const r of predictions) {
    const w = weightOf(r);
    const p = clip(r.pHat);
    num += w * -(r.y * Math.log(p) + (1 - r.y) * Math.log(1 - p));
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * AUROC via the rank identity:
 *   AUROC = (Σ rank_pos - n_pos (n_pos + 1)/2) / (n_pos * n_neg)
 * Handles ties by assigning average ranks. Returns 0.5 when all labels are
 * the same class (undefined AUROC).
 */
export function auroc(predictions: ReadonlyArray<LabeledPrediction>): number {
  assertNonEmpty(predictions, "auroc");
  const rows = predictions.slice().sort((a, b) => a.pHat - b.pHat);
  const n = rows.length;

  // Assign ranks with average-rank tie handling.
  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && rows[j + 1].pHat === rows[i].pHat) j++;
    const avg = (i + j) / 2 + 1; // 1-indexed
    for (let k = i; k <= j; k++) ranks[k] = avg;
    i = j + 1;
  }

  let sumRankPos = 0;
  let nPos = 0;
  let nNeg = 0;
  for (let k = 0; k < n; k++) {
    if (rows[k].y === 1) {
      nPos++;
      sumRankPos += ranks[k];
    } else {
      nNeg++;
    }
  }
  if (nPos === 0 || nNeg === 0) return 0.5;
  return (sumRankPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/**
 * Confusion matrix at a decision threshold. Positive if pHat >= threshold.
 */
export function confusionAt(
  predictions: ReadonlyArray<LabeledPrediction>,
  threshold: number,
): { tp: number; fp: number; tn: number; fn: number } {
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  for (const r of predictions) {
    const w = weightOf(r);
    const yhat = r.pHat >= threshold ? 1 : 0;
    if (yhat === 1 && r.y === 1) tp += w;
    else if (yhat === 1 && r.y === 0) fp += w;
    else if (yhat === 0 && r.y === 0) tn += w;
    else fn += w;
  }
  return { tp, fp, tn, fn };
}

function safeDiv(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}

/**
 * ROC curve as an ascending-threshold sweep over the unique predicted
 * probabilities (plus {-Infinity, Infinity} anchors). Returned in decreasing
 * threshold order so consumers can integrate naturally from (0,0) to (1,1).
 */
export function rocCurve(
  predictions: ReadonlyArray<LabeledPrediction>,
): ReadonlyArray<RocPoint> {
  assertNonEmpty(predictions, "rocCurve");
  const thresholds = Array.from(
    new Set(predictions.map((p) => p.pHat)),
  ).sort((a, b) => b - a);
  thresholds.unshift(Number.POSITIVE_INFINITY);
  thresholds.push(Number.NEGATIVE_INFINITY);
  const out: RocPoint[] = [];
  for (const t of thresholds) {
    const { tp, fp, tn, fn } = confusionAt(predictions, t);
    out.push({
      threshold: t,
      fpr: safeDiv(fp, fp + tn),
      tpr: safeDiv(tp, tp + fn),
    });
  }
  return out;
}

export function prCurve(
  predictions: ReadonlyArray<LabeledPrediction>,
): ReadonlyArray<PrPoint> {
  assertNonEmpty(predictions, "prCurve");
  const thresholds = Array.from(
    new Set(predictions.map((p) => p.pHat)),
  ).sort((a, b) => b - a);
  const out: PrPoint[] = [];
  for (const t of thresholds) {
    const { tp, fp, fn } = confusionAt(predictions, t);
    out.push({
      threshold: t,
      precision: tp + fp === 0 ? 1 : tp / (tp + fp),
      recall: safeDiv(tp, tp + fn),
    });
  }
  return out;
}

/**
 * Average precision = area under the precision-recall curve via trapezoidal
 * integration on the recall axis. A robust substitute for AUROC when
 * positives are rare (e.g. churn forecasting).
 */
export function averagePrecision(
  predictions: ReadonlyArray<LabeledPrediction>,
): number {
  const curve = prCurve(predictions).slice().sort((a, b) => a.recall - b.recall);
  if (curve.length === 0) return 0;
  // Prepend zero-recall anchor using the leftmost precision.
  const pts = [{ recall: 0, precision: curve[0].precision }, ...curve];
  let area = 0;
  for (let i = 1; i < pts.length; i++) {
    const dR = pts[i].recall - pts[i - 1].recall;
    const avgP = (pts[i].precision + pts[i - 1].precision) / 2;
    area += dR * avgP;
  }
  return area;
}

export function classificationMetrics(
  predictions: ReadonlyArray<LabeledPrediction>,
  threshold = 0.5,
): ClassificationMetrics {
  assertNonEmpty(predictions, "classificationMetrics");
  let posW = 0,
    negW = 0,
    totalW = 0;
  for (const r of predictions) {
    const w = weightOf(r);
    totalW += w;
    if (r.y === 1) posW += w;
    else negW += w;
  }
  const { tp, fp, tn, fn } = confusionAt(predictions, threshold);
  const precision = safeDiv(tp, tp + fp);
  const recall = safeDiv(tp, tp + fn);
  const f1 = safeDiv(2 * precision * recall, precision + recall);
  return {
    n: totalW,
    positives: posW,
    negatives: negW,
    brier: brier(predictions),
    logLoss: logLoss(predictions),
    accuracy: safeDiv(tp + tn, tp + tn + fp + fn),
    precision,
    recall,
    f1,
    auroc: auroc(predictions),
    avgPrecision: averagePrecision(predictions),
  };
}

// -----------------------------------------------------------------------------
// Backtest runner
// -----------------------------------------------------------------------------

export interface BacktestFold {
  readonly index: number;
  readonly trainSize: number;
  readonly testSize: number;
  readonly metrics: ClassificationMetrics;
  readonly calibration: CalibrationReport;
}

export interface BacktestReport {
  readonly folds: ReadonlyArray<BacktestFold>;
  /** Sample-weighted average metrics across folds. */
  readonly aggregate: ClassificationMetrics;
  /** Sample-weighted average calibration across folds (recomputed on pooled). */
  readonly aggregateCalibration: CalibrationReport;
}

export interface BacktestExample<F> {
  readonly features: F;
  readonly y: 0 | 1;
  readonly weight?: number;
  readonly id?: string;
  /** Optional timestamp for ordering in walk-forward splits. */
  readonly asOfIso?: string;
}

export interface BacktestOptions<F> {
  /** Split examples into K folds — walk-forward if asOfIso is present, else random. */
  readonly folds: number;
  /** Model that fits on train rows and returns a scorer. */
  readonly fitModel: (
    train: ReadonlyArray<BacktestExample<F>>,
  ) => (features: F) => number;
  /** Optional decision threshold (default 0.5). */
  readonly threshold?: number;
  /** Seed for RNG-based folds; ignored when walk-forward applies. */
  readonly seed?: number;
  /** Calibration bucket count (default 10). */
  readonly calibrationBuckets?: number;
}

function seededPrng(seed: number): () => number {
  let s = (seed | 0) || 0x9e3779b9;
  return () => {
    // Mulberry32
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function walkForwardSplit<F>(
  rows: ReadonlyArray<BacktestExample<F>>,
  folds: number,
): Array<{ train: BacktestExample<F>[]; test: BacktestExample<F>[] }> {
  const hasTs = rows.every((r) => typeof r.asOfIso === "string");
  const indexed = rows.map((r, i) => ({ r, i }));
  if (hasTs) {
    indexed.sort(
      (a, b) =>
        new Date(a.r.asOfIso!).getTime() - new Date(b.r.asOfIso!).getTime(),
    );
  }
  const n = rows.length;
  const chunk = Math.ceil(n / folds);
  const out: Array<{ train: BacktestExample<F>[]; test: BacktestExample<F>[] }> = [];
  for (let f = 1; f < folds; f++) {
    const trainEnd = f * chunk;
    const train = indexed.slice(0, trainEnd).map((x) => x.r);
    const test = indexed.slice(trainEnd, trainEnd + chunk).map((x) => x.r);
    if (test.length === 0) continue;
    out.push({ train, test });
  }
  return out;
}

function randomKFold<F>(
  rows: ReadonlyArray<BacktestExample<F>>,
  folds: number,
  seed: number,
): Array<{ train: BacktestExample<F>[]; test: BacktestExample<F>[] }> {
  const rng = seededPrng(seed);
  const shuffled = rows.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const out: Array<{ train: BacktestExample<F>[]; test: BacktestExample<F>[] }> = [];
  for (let f = 0; f < folds; f++) {
    const test = shuffled.filter((_, i) => i % folds === f);
    const train = shuffled.filter((_, i) => i % folds !== f);
    out.push({ train, test });
  }
  return out;
}

/**
 * Run K-fold or walk-forward backtest against a user-supplied scorer factory.
 * Produces per-fold and aggregate (pooled) metrics and calibration.
 */
export function runBacktest<F>(
  examples: ReadonlyArray<BacktestExample<F>>,
  opts: BacktestOptions<F>,
): BacktestReport {
  if (examples.length < opts.folds) {
    throw new Error(
      `runBacktest: need at least ${opts.folds} examples, got ${examples.length}`,
    );
  }
  const threshold = opts.threshold ?? 0.5;
  const buckets = opts.calibrationBuckets ?? 10;
  const seed = opts.seed ?? 0xABCDEF;
  const hasTs = examples.every((r) => typeof r.asOfIso === "string");
  const splits = hasTs
    ? walkForwardSplit(examples, opts.folds)
    : randomKFold(examples, opts.folds, seed);

  const foldReports: BacktestFold[] = [];
  const pooled: LabeledPrediction[] = [];
  splits.forEach((split, idx) => {
    const scorer = opts.fitModel(split.train);
    const preds: LabeledPrediction[] = split.test.map((row) => ({
      pHat: Math.max(0, Math.min(1, scorer(row.features))),
      y: row.y,
      weight: row.weight,
      id: row.id,
    }));
    if (preds.length === 0) return;
    pooled.push(...preds);
    foldReports.push({
      index: idx,
      trainSize: split.train.length,
      testSize: split.test.length,
      metrics: classificationMetrics(preds, threshold),
      calibration: calibrationReport(preds, buckets),
    });
  });

  return {
    folds: foldReports,
    aggregate: classificationMetrics(pooled, threshold),
    aggregateCalibration: calibrationReport(pooled, buckets),
  };
}
