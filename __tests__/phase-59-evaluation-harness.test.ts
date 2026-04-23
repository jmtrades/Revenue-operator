/**
 * Phase 59 — Evaluation harness.
 */
import { describe, it, expect } from "vitest";
import {
  brier,
  logLoss,
  auroc,
  averagePrecision,
  calibrationReport,
  confusionAt,
  classificationMetrics,
  rocCurve,
  prCurve,
  runBacktest,
  type LabeledPrediction,
  type BacktestExample,
} from "../src/lib/revenue-core/evaluation";

const perfect: LabeledPrediction[] = [
  { pHat: 0.99, y: 1 },
  { pHat: 0.98, y: 1 },
  { pHat: 0.02, y: 0 },
  { pHat: 0.01, y: 0 },
];
const random: LabeledPrediction[] = [
  { pHat: 0.5, y: 1 },
  { pHat: 0.5, y: 0 },
  { pHat: 0.5, y: 1 },
  { pHat: 0.5, y: 0 },
];
const inverted: LabeledPrediction[] = [
  { pHat: 0.99, y: 0 },
  { pHat: 0.98, y: 0 },
  { pHat: 0.02, y: 1 },
  { pHat: 0.01, y: 1 },
];

describe("brier / logLoss", () => {
  it("brier is tiny on near-perfect calibration", () => {
    expect(brier(perfect)).toBeLessThan(0.01);
  });
  it("brier is large on inverted", () => {
    expect(brier(inverted)).toBeGreaterThan(0.9);
  });
  it("logLoss clips extremes — finite even at 0/1", () => {
    const rows: LabeledPrediction[] = [{ pHat: 0, y: 1 }];
    const ll = logLoss(rows);
    expect(Number.isFinite(ll)).toBe(true);
    expect(ll).toBeGreaterThan(10);
  });
  it("throws on empty", () => {
    expect(() => brier([])).toThrow();
    expect(() => logLoss([])).toThrow();
  });
});

describe("auroc", () => {
  it("perfect separation = 1.0", () => {
    expect(auroc(perfect)).toBe(1);
  });
  it("inverted = 0.0", () => {
    expect(auroc(inverted)).toBe(0);
  });
  it("random (all same score) = 0.5 via tie averaging", () => {
    expect(auroc(random)).toBe(0.5);
  });
  it("degenerate single-class returns 0.5", () => {
    const all1: LabeledPrediction[] = [{ pHat: 0.3, y: 1 }, { pHat: 0.7, y: 1 }];
    expect(auroc(all1)).toBe(0.5);
  });

  it("matches hand-computed value on a small mixed example", () => {
    const rows: LabeledPrediction[] = [
      { pHat: 0.1, y: 0 },
      { pHat: 0.4, y: 0 },
      { pHat: 0.35, y: 1 },
      { pHat: 0.8, y: 1 },
    ];
    // Positives have ranks 2 and 4 (after sort by pHat: 0.1, 0.35, 0.4, 0.8).
    // sumRankPos = 2 + 4 = 6; nPos = 2, nNeg = 2.
    // AUC = (6 - 2*3/2) / (2*2) = (6 - 3)/4 = 0.75.
    expect(auroc(rows)).toBeCloseTo(0.75, 6);
  });
});

describe("calibrationReport", () => {
  it("perfectly calibrated rows yield near-zero ECE", () => {
    const rows: LabeledPrediction[] = [];
    // For each of 10 buckets, 10 rows where fraction of y=1 matches midpoint.
    for (let b = 0; b < 10; b++) {
      const mid = (b + 0.5) / 10;
      const positives = Math.round(mid * 10);
      for (let k = 0; k < 10; k++) {
        rows.push({ pHat: mid, y: k < positives ? 1 : 0 });
      }
    }
    const rep = calibrationReport(rows, 10);
    expect(rep.ece).toBeLessThan(0.051);
  });

  it("inverted predictions yield large ECE", () => {
    const rows: LabeledPrediction[] = [
      { pHat: 0.9, y: 0 },
      { pHat: 0.9, y: 0 },
      { pHat: 0.1, y: 1 },
      { pHat: 0.1, y: 1 },
    ];
    const rep = calibrationReport(rows, 10);
    expect(rep.ece).toBeGreaterThan(0.7);
  });

  it("buckets omit empty bins", () => {
    const rows: LabeledPrediction[] = [{ pHat: 0.05, y: 1 }, { pHat: 0.95, y: 0 }];
    const rep = calibrationReport(rows, 10);
    expect(rep.buckets.length).toBe(2);
    expect(rep.bucketCount).toBe(10);
  });

  it("applies weights", () => {
    const rows: LabeledPrediction[] = [
      { pHat: 0.8, y: 1, weight: 100 },
      { pHat: 0.8, y: 0, weight: 1 },
    ];
    const rep = calibrationReport(rows, 10);
    // Weighted mean y ≈ 100/101 ≈ 0.99; predicted 0.8 → gap about -0.19.
    const bucket = rep.buckets[0];
    expect(bucket.meanActual).toBeCloseTo(100 / 101, 4);
  });
});

describe("confusionAt / classificationMetrics", () => {
  const rows: LabeledPrediction[] = [
    { pHat: 0.9, y: 1 },
    { pHat: 0.8, y: 1 },
    { pHat: 0.4, y: 1 },
    { pHat: 0.7, y: 0 },
    { pHat: 0.3, y: 0 },
    { pHat: 0.1, y: 0 },
  ];
  it("threshold 0.5 yields expected TP/FP/TN/FN", () => {
    const c = confusionAt(rows, 0.5);
    expect(c.tp).toBe(2);
    expect(c.fp).toBe(1);
    expect(c.tn).toBe(2);
    expect(c.fn).toBe(1);
  });

  it("classificationMetrics is internally consistent", () => {
    const m = classificationMetrics(rows, 0.5);
    expect(m.positives).toBe(3);
    expect(m.negatives).toBe(3);
    expect(m.precision).toBeCloseTo(2 / 3, 6);
    expect(m.recall).toBeCloseTo(2 / 3, 6);
    expect(m.f1).toBeCloseTo(2 / 3, 6);
    expect(m.auroc).toBeGreaterThan(0.5);
  });
});

describe("rocCurve / prCurve / averagePrecision", () => {
  const rows: LabeledPrediction[] = [
    { pHat: 0.9, y: 1 },
    { pHat: 0.8, y: 1 },
    { pHat: 0.7, y: 0 },
    { pHat: 0.6, y: 1 },
    { pHat: 0.5, y: 0 },
    { pHat: 0.4, y: 0 },
    { pHat: 0.3, y: 1 },
    { pHat: 0.2, y: 0 },
  ];

  it("rocCurve endpoints anchor at (0,0) and (1,1)", () => {
    const curve = rocCurve(rows);
    expect(curve[0].tpr).toBe(0);
    expect(curve[0].fpr).toBe(0);
    const last = curve[curve.length - 1];
    expect(last.tpr).toBe(1);
    expect(last.fpr).toBe(1);
  });

  it("averagePrecision is in [0,1]", () => {
    const ap = averagePrecision(rows);
    expect(ap).toBeGreaterThan(0);
    expect(ap).toBeLessThanOrEqual(1);
  });

  it("prCurve has a point per unique threshold", () => {
    const curve = prCurve(rows);
    expect(curve.length).toBe(new Set(rows.map((r) => r.pHat)).size);
  });
});

describe("runBacktest", () => {
  function makeExamples(n: number): BacktestExample<{ x: number }>[] {
    // Generate deterministic examples: y ~ Bernoulli(sigmoid(x)).
    const out: BacktestExample<{ x: number }>[] = [];
    for (let i = 0; i < n; i++) {
      const x = ((i * 7) % 41) / 41 - 0.5; // pseudo-uniform [-0.5, 0.5]
      const p = 1 / (1 + Math.exp(-8 * x));
      const y: 0 | 1 = p > 0.5 ? 1 : 0;
      out.push({
        features: { x },
        y,
        asOfIso: new Date(2026, 0, 1 + i).toISOString(),
      });
    }
    return out;
  }

  it("walk-forward backtest produces folds and aggregate metrics", () => {
    const rows = makeExamples(40);
    const rep = runBacktest(rows, {
      folds: 4,
      fitModel: (_train) => (f) => 1 / (1 + Math.exp(-8 * f.x)),
    });
    expect(rep.folds.length).toBeGreaterThanOrEqual(3);
    expect(rep.aggregate.n).toBeGreaterThan(0);
    // Model perfectly fits the generating process → AUC ≈ 1, low Brier.
    expect(rep.aggregate.auroc).toBeGreaterThan(0.99);
    expect(rep.aggregate.brier).toBeLessThan(0.05);
  });

  it("random K-fold works without timestamps", () => {
    const rows = makeExamples(40).map((r) => ({ ...r, asOfIso: undefined }));
    const rep = runBacktest(rows, {
      folds: 5,
      seed: 42,
      fitModel: () => (f) => 1 / (1 + Math.exp(-8 * f.x)),
    });
    expect(rep.folds.length).toBe(5);
    expect(rep.aggregate.n).toBe(40);
  });

  it("throws when fewer examples than folds", () => {
    const rows = makeExamples(3);
    expect(() =>
      runBacktest(rows, { folds: 10, fitModel: () => (f) => f.x }),
    ).toThrow(/at least/);
  });

  it("trivial constant scorer yields AUROC ~0.5", () => {
    const rows = makeExamples(20);
    const rep = runBacktest(rows, {
      folds: 4,
      fitModel: () => () => 0.5,
    });
    expect(rep.aggregate.auroc).toBeCloseTo(0.5, 1);
  });
});
