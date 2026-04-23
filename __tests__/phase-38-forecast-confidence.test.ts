/**
 * Phase 38 — Forecast confidence intervals + category rollup.
 */

import { describe, it, expect } from "vitest";
import {
  intervalFromDeals,
  forecastPeriod,
  simulateForecast,
  type ForecastDeal,
} from "../src/lib/sales/forecast-confidence";

function d(over: Partial<ForecastDeal>): ForecastDeal {
  return {
    id: "d1",
    ownerId: "rep-a",
    amount: 50_000,
    winProbability: 0.5,
    category: "pipeline",
    stage: "proposal",
    ...over,
  };
}

describe("intervalFromDeals", () => {
  it("expected = sum(amount * p)", () => {
    const deals = [
      d({ id: "a", amount: 100_000, winProbability: 0.5 }),
      d({ id: "b", amount: 50_000, winProbability: 0.8 }),
    ];
    const r = intervalFromDeals(deals);
    expect(r.expected).toBeCloseTo(90_000, 3);
    expect(r.totalAmount).toBe(150_000);
    expect(r.count).toBe(2);
  });

  it("p10 <= p50 <= p90 with nonzero stdDev", () => {
    const deals = [
      d({ id: "a", amount: 100_000, winProbability: 0.5 }),
      d({ id: "b", amount: 200_000, winProbability: 0.3 }),
    ];
    const r = intervalFromDeals(deals);
    expect(r.stdDev).toBeGreaterThan(0);
    expect(r.p10).toBeLessThanOrEqual(r.p50);
    expect(r.p50).toBeLessThanOrEqual(r.p90);
  });

  it("zero variance at p=0 or p=1", () => {
    const r = intervalFromDeals([
      d({ id: "a", amount: 100_000, winProbability: 0 }),
      d({ id: "b", amount: 100_000, winProbability: 1 }),
    ]);
    expect(r.stdDev).toBe(0);
    expect(r.p10).toBe(r.p90);
  });
});

describe("forecastPeriod — category rollup", () => {
  it("sums per-category count + amount + expected", () => {
    const deals = [
      d({ id: "c1", category: "commit", amount: 100_000, winProbability: 0.9 }),
      d({ id: "c2", category: "commit", amount: 50_000, winProbability: 0.8 }),
      d({ id: "b1", category: "best_case", amount: 200_000, winProbability: 0.5 }),
      d({ id: "p1", category: "pipeline", amount: 300_000, winProbability: 0.2 }),
      d({ id: "o1", category: "omitted", amount: 100_000, winProbability: 0.1 }),
    ];
    const r = forecastPeriod(deals, { period: "Q2-2026" });
    expect(r.byCategory.commit.count).toBe(2);
    expect(r.byCategory.commit.amount).toBe(150_000);
    expect(r.byCategory.commit.expected).toBeCloseTo(130_000, 3);
    expect(r.byCategory.best_case.count).toBe(1);
    expect(r.byCategory.pipeline.count).toBe(1);
    expect(r.byCategory.omitted.count).toBe(1);
  });

  it("total excludes omitted category", () => {
    const deals = [
      d({ id: "a", category: "commit", amount: 100_000, winProbability: 0.9 }),
      d({ id: "b", category: "omitted", amount: 500_000, winProbability: 0.9 }),
    ];
    const r = forecastPeriod(deals, { period: "Q2" });
    expect(r.total.expected).toBeCloseTo(90_000, 3);
    expect(r.total.count).toBe(1);
  });

  it("commitCoverage computed when quotas provided", () => {
    const deals = [
      d({ id: "a", ownerId: "rep-a", category: "commit", amount: 200_000, winProbability: 0.9 }),
      d({ id: "b", ownerId: "rep-b", category: "best_case", amount: 100_000, winProbability: 0.5 }),
    ];
    const r = forecastPeriod(deals, {
      period: "Q2",
      quotasByOwner: { "rep-a": 200_000, "rep-b": 100_000 },
    });
    expect(r.commitCoverage).toBeCloseTo(200_000 / 300_000, 3);
    expect(r.bestCaseCoverage).toBeCloseTo(300_000 / 300_000, 3);
  });
});

describe("forecastPeriod — rep sandbag/happy-ear", () => {
  it("detects sandbagging rep with strong pipeline deals outside commit", () => {
    const deals = [
      d({ id: "c1", ownerId: "rep-s", category: "commit", amount: 50_000, winProbability: 0.9 }),
      d({ id: "p1", ownerId: "rep-s", category: "best_case", amount: 200_000, winProbability: 0.95 }),
      d({ id: "p2", ownerId: "rep-s", category: "pipeline", amount: 150_000, winProbability: 0.92 }),
    ];
    const r = forecastPeriod(deals, { period: "Q2" });
    const rep = r.byOwner.find((o) => o.ownerId === "rep-s")!;
    expect(rep.sandbagScore).toBeGreaterThan(0.3);
    expect(rep.sandbagCandidates.length).toBeGreaterThan(0);
    expect(rep.coachNote.toLowerCase()).toContain("sandbag");
  });

  it("detects happy-ear rep with weak deals in commit", () => {
    const deals = [
      d({ id: "c1", ownerId: "rep-h", category: "commit", amount: 100_000, winProbability: 0.35 }),
      d({ id: "c2", ownerId: "rep-h", category: "commit", amount: 100_000, winProbability: 0.4 }),
      d({ id: "p1", ownerId: "rep-h", category: "pipeline", amount: 50_000, winProbability: 0.3 }),
    ];
    const r = forecastPeriod(deals, { period: "Q2" });
    const rep = r.byOwner.find((o) => o.ownerId === "rep-h")!;
    expect(rep.happyEarScore).toBeGreaterThan(0.3);
    expect(rep.happyEarCandidates.length).toBeGreaterThan(0);
    expect(rep.coachNote.toLowerCase()).toContain("happy-ear");
  });

  it("no bias flagged when commit probabilities are strong and pipeline is weak", () => {
    const deals = [
      d({ id: "c1", ownerId: "rep-ok", category: "commit", amount: 100_000, winProbability: 0.85 }),
      d({ id: "c2", ownerId: "rep-ok", category: "commit", amount: 50_000, winProbability: 0.82 }),
      d({ id: "p1", ownerId: "rep-ok", category: "pipeline", amount: 80_000, winProbability: 0.25 }),
    ];
    const r = forecastPeriod(deals, { period: "Q2" });
    const rep = r.byOwner.find((o) => o.ownerId === "rep-ok")!;
    expect(rep.sandbagScore).toBeLessThan(0.3);
    expect(rep.happyEarScore).toBeLessThan(0.3);
    expect(rep.coachNote.toLowerCase()).toContain("call matches");
  });
});

describe("forecastPeriod — per-owner split", () => {
  it("splits deals by owner", () => {
    const deals = [
      d({ id: "a1", ownerId: "rep-a", amount: 100_000, winProbability: 0.5 }),
      d({ id: "a2", ownerId: "rep-a", amount: 100_000, winProbability: 0.6 }),
      d({ id: "b1", ownerId: "rep-b", amount: 200_000, winProbability: 0.3 }),
    ];
    const r = forecastPeriod(deals, { period: "Q2" });
    expect(r.byOwner.length).toBe(2);
    const a = r.byOwner.find((o) => o.ownerId === "rep-a")!;
    expect(a.interval.count).toBe(2);
    expect(a.interval.expected).toBeCloseTo(110_000, 3);
  });
});

describe("forecastPeriod — recommendedCallNumber", () => {
  it("recommended number is between p10 and expected", () => {
    const deals = [
      d({ id: "a", ownerId: "x", category: "commit", amount: 100_000, winProbability: 0.9 }),
      d({ id: "b", ownerId: "x", category: "best_case", amount: 200_000, winProbability: 0.5 }),
      d({ id: "c", ownerId: "x", category: "pipeline", amount: 300_000, winProbability: 0.25 }),
    ];
    const r = forecastPeriod(deals, { period: "Q2" });
    expect(r.recommendedCallNumber).toBeGreaterThanOrEqual(Math.round(r.total.p10));
    expect(r.recommendedCallNumber).toBeLessThanOrEqual(Math.round(r.total.expected));
    expect(r.recommendedCallNumber).toBeGreaterThanOrEqual(Math.round(r.byCategory.commit.expected));
  });
});

describe("simulateForecast", () => {
  it("empirical mean ≈ analytical expected", () => {
    const deals = [
      d({ id: "a", amount: 100_000, winProbability: 0.5 }),
      d({ id: "b", amount: 50_000, winProbability: 0.8 }),
    ];
    let seed = 42;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const sim = simulateForecast(deals, 5_000, rng);
    expect(sim.mean).toBeGreaterThan(80_000);
    expect(sim.mean).toBeLessThan(100_000);
    expect(sim.p10).toBeLessThanOrEqual(sim.p50);
    expect(sim.p50).toBeLessThanOrEqual(sim.p90);
  });
});
