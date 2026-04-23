/**
 * Phase 60 — Feedback loop + learned weights.
 */
import { describe, it, expect } from "vitest";
import {
  ingestOutcomeEvents,
  fitLogisticWeights,
  scoreLogistic,
  selectKernelBandwidth,
  type OutcomeEvent,
  type LabeledRow,
} from "../src/lib/revenue-core/feedback";

describe("ingestOutcomeEvents", () => {
  it("labels positive / negative kinds correctly", () => {
    const events: OutcomeEvent[] = [
      {
        kind: "deal_won",
        subjectId: "d1",
        asOfIso: "2026-01-01T00:00:00Z",
        features: { x: 1 },
      },
      {
        kind: "deal_lost",
        subjectId: "d2",
        asOfIso: "2026-01-02T00:00:00Z",
        features: { x: -1 },
      },
      {
        kind: "renewal_retained",
        subjectId: "a1",
        asOfIso: "2026-01-03T00:00:00Z",
        features: { x: 0.5 },
      },
      {
        kind: "renewal_churned",
        subjectId: "a2",
        asOfIso: "2026-01-04T00:00:00Z",
        features: { x: -0.5 },
      },
    ];
    const rows = ingestOutcomeEvents(events);
    expect(rows.length).toBe(4);
    expect(rows[0].y).toBe(1);
    expect(rows[1].y).toBe(0);
    expect(rows[2].y).toBe(1);
    expect(rows[3].y).toBe(0);
  });

  it("deduplicates on eventId", () => {
    const events: OutcomeEvent[] = [
      {
        kind: "deal_won",
        subjectId: "d1",
        asOfIso: "2026-01-01T00:00:00Z",
        features: { x: 1 },
        eventId: "e1",
      },
      {
        kind: "deal_won",
        subjectId: "d1",
        asOfIso: "2026-01-01T00:00:00Z",
        features: { x: 1 },
        eventId: "e1",
      },
    ];
    expect(ingestOutcomeEvents(events).length).toBe(1);
  });

  it("drops rows with non-finite features", () => {
    const events: OutcomeEvent[] = [
      {
        kind: "deal_won",
        subjectId: "d1",
        asOfIso: "2026-01-01T00:00:00Z",
        features: { x: NaN },
      },
      {
        kind: "deal_won",
        subjectId: "d2",
        asOfIso: "2026-01-02T00:00:00Z",
        features: { x: 1 },
      },
    ];
    const rows = ingestOutcomeEvents(events);
    expect(rows.length).toBe(1);
    expect(rows[0].subjectId).toBe("d2");
  });

  it("sorts rows chronologically then by subjectId", () => {
    const events: OutcomeEvent[] = [
      {
        kind: "deal_won",
        subjectId: "d2",
        asOfIso: "2026-01-02T00:00:00Z",
        features: { x: 1 },
      },
      {
        kind: "deal_won",
        subjectId: "d1",
        asOfIso: "2026-01-01T00:00:00Z",
        features: { x: 1 },
      },
    ];
    const rows = ingestOutcomeEvents(events);
    expect(rows.map((r) => r.subjectId)).toEqual(["d1", "d2"]);
  });

  it("default weight = 1; respects override", () => {
    const events: OutcomeEvent[] = [
      {
        kind: "deal_won",
        subjectId: "d1",
        asOfIso: "2026-01-01T00:00:00Z",
        features: { x: 1 },
      },
      {
        kind: "deal_won",
        subjectId: "d2",
        asOfIso: "2026-01-02T00:00:00Z",
        features: { x: 1 },
        weight: 100,
      },
    ];
    const rows = ingestOutcomeEvents(events);
    expect(rows[0].weight).toBe(1);
    expect(rows[1].weight).toBe(100);
  });
});

describe("fitLogisticWeights", () => {
  // Generate deterministic rows: y = sigmoid(2x + 0.5) > 0.5 ? 1 : 0.
  function makeRows(n: number): LabeledRow[] {
    const out: LabeledRow[] = [];
    for (let i = 0; i < n; i++) {
      const x = ((i * 13) % 100) / 50 - 1; // [-1, 1]
      const z = 2 * x + 0.5;
      const p = 1 / (1 + Math.exp(-z));
      out.push({
        subjectId: `s${i}`,
        asOfIso: "2026-01-01T00:00:00Z",
        features: { x },
        y: p > 0.5 ? 1 : 0,
        weight: 1,
      });
    }
    return out;
  }

  it("recovers the sign of a planted effect", () => {
    const rows = makeRows(120);
    const fit = fitLogisticWeights(rows, {
      featureNames: ["x"],
      l2: 1e-3,
      maxIter: 800,
    });
    expect(fit.coefficients.x).toBeGreaterThan(0);
    expect(fit.finalLoss).toBeLessThan(0.5);
  });

  it("scoreLogistic produces probabilities in [0,1]", () => {
    const fit = fitLogisticWeights(makeRows(80), {
      featureNames: ["x"],
      l2: 1e-3,
    });
    for (const x of [-2, -0.5, 0, 0.5, 2]) {
      const p = scoreLogistic(fit, { x });
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("handles unknown features gracefully", () => {
    const fit = fitLogisticWeights(makeRows(60), { featureNames: ["x"] });
    const p = scoreLogistic(fit, { x: 0.5, totally_new: 42 });
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("separable data drives loss near zero", () => {
    // Separable: y = 1 iff x > 0.
    const rows: LabeledRow[] = [];
    for (let i = -10; i <= 10; i++) {
      if (i === 0) continue;
      rows.push({
        subjectId: `s${i}`,
        asOfIso: "2026-01-01T00:00:00Z",
        features: { x: i },
        y: i > 0 ? 1 : 0,
        weight: 1,
      });
    }
    const fit = fitLogisticWeights(rows, {
      featureNames: ["x"],
      l2: 1e-3,
      maxIter: 1500,
    });
    expect(fit.coefficients.x).toBeGreaterThan(0);
    expect(fit.finalLoss).toBeLessThan(0.2);
  });

  it("L2 regularization shrinks weights toward zero", () => {
    const rows = makeRows(80);
    const strong = fitLogisticWeights(rows, {
      featureNames: ["x"],
      l2: 10,
      maxIter: 800,
    });
    const weak = fitLogisticWeights(rows, {
      featureNames: ["x"],
      l2: 0,
      maxIter: 800,
    });
    expect(Math.abs(strong.coefficients.x)).toBeLessThan(
      Math.abs(weak.coefficients.x),
    );
  });

  it("throws on empty data", () => {
    expect(() =>
      fitLogisticWeights([], { featureNames: ["x"] }),
    ).toThrow(/no rows/);
  });
});

describe("selectKernelBandwidth", () => {
  it("picks smallest RMSE from grid", () => {
    // y = sin(x); with clean data, narrow bandwidth should win.
    const x = Array.from({ length: 40 }, (_, i) => (i / 40) * Math.PI * 2);
    const y = x.map((v) => Math.sin(v));
    const sel = selectKernelBandwidth(x, y, [0.05, 0.2, 1.0, 3.0]);
    expect(sel.candidates.length).toBe(4);
    expect(sel.bandwidth).toBeLessThanOrEqual(1.0);
  });

  it("narrower bandwidth on noisy data is penalized by LOO CV", () => {
    // Flat signal (0) + high-variance deterministic noise. With no signal,
    // tiny bandwidths overfit per-point noise and lose to wider smoothing.
    const x = Array.from({ length: 60 }, (_, i) => i / 10);
    const y = x.map((_, i) => Math.sin(i * 17.3) * 2 + Math.sin(i * 3.1) * 1.5);
    const sel = selectKernelBandwidth(x, y, [0.05, 0.5, 1.5, 5.0]);
    expect(sel.bandwidth).toBeGreaterThan(0.05);
  });

  it("throws on mismatched arrays", () => {
    expect(() => selectKernelBandwidth([1, 2, 3], [1, 2], [0.5])).toThrow();
  });

  it("throws on too-few points", () => {
    expect(() => selectKernelBandwidth([1], [1], [0.5])).toThrow();
  });

  it("throws on empty bandwidth grid", () => {
    expect(() => selectKernelBandwidth([1, 2, 3], [1, 2, 3], [])).toThrow();
  });

  it("throws on non-positive bandwidth", () => {
    expect(() => selectKernelBandwidth([1, 2, 3], [1, 2, 3], [0])).toThrow();
    expect(() => selectKernelBandwidth([1, 2, 3], [1, 2, 3], [-1])).toThrow();
  });
});
