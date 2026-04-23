/**
 * Phase 37 — Deal win-probability predictor.
 */

import { describe, it, expect } from "vitest";
import {
  predictWinProbability,
  buildIsotonicCalibration,
  forecastExpectedValue,
  type WinProbDealSnapshot,
} from "../src/lib/sales/win-probability";

function deal(over: Partial<WinProbDealSnapshot> = {}): WinProbDealSnapshot {
  return {
    id: "d1",
    amount: 50_000,
    stage: "proposal",
    ageDays: 30,
    daysSinceLastActivity: 3,
    daysToCloseDate: 20,
    closeDatePushCount: 0,
    stakeholderCount: 3,
    championIdentified: true,
    economicBuyerEngaged: true,
    blockerIdentified: false,
    competitorInDeal: false,
    mutualActionPlanExists: true,
    icpScore: 80,
    intentStrength: 60,
    ...over,
  };
}

describe("predictWinProbability — terminal stages", () => {
  it("closed_won → probability 1", () => {
    const r = predictWinProbability(deal({ stage: "closed_won" }));
    expect(r.probability).toBe(1);
    expect(r.expectedValue).toBe(50_000);
  });

  it("closed_lost → probability 0", () => {
    const r = predictWinProbability(deal({ stage: "closed_lost" }));
    expect(r.probability).toBe(0);
    expect(r.expectedValue).toBe(0);
  });
});

describe("predictWinProbability — feature directions", () => {
  it("champion+EB+MAP raises probability vs baseline prior", () => {
    const r = predictWinProbability(deal());
    expect(r.probability).toBeGreaterThan(r.stagePrior);
    expect(r.topPositiveDrivers.some((f) => f.code === "champion")).toBe(true);
    expect(r.topPositiveDrivers.some((f) => f.code === "economic_buyer")).toBe(true);
  });

  it("stall + competitor + blocker lowers probability", () => {
    const healthy = predictWinProbability(deal());
    const risky = predictWinProbability(
      deal({
        daysSinceLastActivity: 30,
        competitorInDeal: true,
        blockerIdentified: true,
      }),
    );
    expect(risky.probability).toBeLessThan(healthy.probability);
    expect(risky.topNegativeDrivers.some((f) => f.code === "stalled")).toBe(true);
    expect(risky.topNegativeDrivers.some((f) => f.code === "blocker")).toBe(true);
  });

  it("POC passed > POC failed", () => {
    const passed = predictWinProbability(deal({ poc: { completed: true, passed: true } }));
    const failed = predictWinProbability(deal({ poc: { completed: true, passed: false } }));
    expect(passed.probability).toBeGreaterThan(failed.probability);
  });

  it("deep discount penalizes", () => {
    const baseline = predictWinProbability(deal({ discountRequestedPct: 0.1 }));
    const deep = predictWinProbability(deal({ discountRequestedPct: 0.4 }));
    expect(deep.probability).toBeLessThan(baseline.probability);
  });

  it("no champion late-stage fires penalty feature", () => {
    const r = predictWinProbability(
      deal({ stage: "negotiation", championIdentified: false }),
    );
    expect(r.features.some((f) => f.code === "no_champion_late_stage")).toBe(true);
  });
});

describe("predictWinProbability — confidence levels", () => {
  it("high confidence on mature deal with many features", () => {
    const r = predictWinProbability(
      deal({
        ageDays: 45,
        poc: { completed: true, passed: true },
        legalEngaged: true,
        procurementEngaged: true,
        salesAcceptedBudget: true,
      }),
    );
    expect(r.confidence).toBe("high");
  });

  it("low confidence on early stubby deal", () => {
    const r = predictWinProbability(
      deal({
        stage: "discovery",
        ageDays: 3,
        championIdentified: false,
        economicBuyerEngaged: false,
        mutualActionPlanExists: false,
        icpScore: undefined,
        intentStrength: undefined,
        stakeholderCount: 1,
      }),
    );
    expect(r.confidence).toBe("low");
  });
});

describe("predictWinProbability — stage prior", () => {
  it("verbal_commit has higher prior than discovery", () => {
    const lo = predictWinProbability(deal({ stage: "discovery" }));
    const hi = predictWinProbability(deal({ stage: "verbal_commit" }));
    expect(hi.stagePrior).toBeGreaterThan(lo.stagePrior);
  });

  it("custom priorStageWinRate overrides default", () => {
    const r = predictWinProbability(deal({ stage: "discovery", priorStageWinRate: 0.9 }));
    expect(r.stagePrior).toBe(0.9);
  });
});

describe("predictWinProbability — calibration", () => {
  it("calibration hook is applied", () => {
    const cal = (_p: number) => 0.42;
    const r = predictWinProbability(deal(), { calibration: cal });
    expect(r.probability).toBeCloseTo(0.42, 5);
    expect(r.calibrated).toBe(true);
  });

  it("buildIsotonicCalibration pools violators into monotone rates", () => {
    const pairs = Array.from({ length: 200 }, (_, i) => ({
      predicted: Math.min(0.99, i / 200),
      actualWon: Math.random() < i / 200,
    }));
    const cal = buildIsotonicCalibration(pairs);
    // Monotone non-decreasing across bins.
    let last = -Infinity;
    for (let p = 0; p < 1; p += 0.1) {
      const v = cal(p);
      expect(v).toBeGreaterThanOrEqual(last - 1e-9);
      last = v;
    }
  });

  it("buildIsotonicCalibration no-ops when too few pairs", () => {
    const cal = buildIsotonicCalibration([
      { predicted: 0.3, actualWon: false },
      { predicted: 0.8, actualWon: true },
    ]);
    expect(cal(0.5)).toBe(0.5);
  });
});

describe("predictWinProbability — recommendations", () => {
  it("commit-ready recommendation at p>=0.75", () => {
    // Build a near-certain deal.
    const r = predictWinProbability(
      deal({
        stage: "verbal_commit",
        poc: { completed: true, passed: true },
        legalEngaged: true,
        procurementEngaged: true,
        salesAcceptedBudget: true,
        stakeholderCount: 6,
      }),
    );
    expect(r.probability).toBeGreaterThanOrEqual(0.75);
    expect(r.recommendation.toLowerCase()).toContain("commit");
  });

  it("at-risk recommendation at p<0.25", () => {
    const r = predictWinProbability(
      deal({
        stage: "discovery",
        championIdentified: false,
        economicBuyerEngaged: false,
        mutualActionPlanExists: false,
        daysSinceLastActivity: 45,
        competitorInDeal: true,
        blockerIdentified: true,
        icpScore: 30,
        intentStrength: 10,
      }),
    );
    expect(r.probability).toBeLessThan(0.25);
    expect(r.recommendation.toLowerCase()).toMatch(/at risk|re-qualify/);
  });
});

describe("forecastExpectedValue", () => {
  it("sums expected value and groups by confidence", () => {
    const preds = [
      predictWinProbability(deal({ id: "a", amount: 100_000 })),
      predictWinProbability(
        deal({
          id: "b",
          amount: 20_000,
          stage: "discovery",
          ageDays: 2,
          championIdentified: false,
          economicBuyerEngaged: false,
          mutualActionPlanExists: false,
          stakeholderCount: 1,
          icpScore: undefined,
          intentStrength: undefined,
        }),
      ),
      predictWinProbability(
        deal({
          id: "c",
          amount: 300_000,
          stage: "verbal_commit",
          ageDays: 60,
          poc: { completed: true, passed: true },
          legalEngaged: true,
          procurementEngaged: true,
          salesAcceptedBudget: true,
          stakeholderCount: 6,
        }),
      ),
    ];
    const f = forecastExpectedValue(preds);
    expect(f.total).toBeGreaterThan(0);
    const totalCount =
      f.byConfidence.low.count + f.byConfidence.medium.count + f.byConfidence.high.count;
    expect(totalCount).toBe(3);
    expect(f.commitReady.length).toBeGreaterThanOrEqual(1);
    expect(f.commitReady.every((p) => p.probability >= 0.75)).toBe(true);
  });
});
