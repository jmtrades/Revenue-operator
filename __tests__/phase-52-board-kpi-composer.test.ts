/**
 * Phase 52 — Board KPI export composer.
 */
import { describe, it, expect } from "vitest";
import {
  composeBoardPackage,
  flattenBoardPackage,
  type BoardPeriodSnapshot,
} from "../src/lib/sales/board-kpi-composer";

function snap(over: Partial<BoardPeriodSnapshot> = {}): BoardPeriodSnapshot {
  return {
    label: "Q1-2026",
    startIso: "2026-01-01T00:00:00.000Z",
    endIso: "2026-03-31T23:59:59.000Z",
    revenue: {
      startArr: 10_000_000,
      endArr: 12_000_000,
      newArr: 2_500_000,
      expansionArr: 800_000,
      contractionArr: 200_000,
      churnedArr: 1_100_000,
      logosStart: 200,
      logosChurned: 10,
    },
    costs: {
      salesAndMarketingCost: 1_200_000,
      rdCost: 900_000,
      gaCost: 400_000,
      cogs: 1_500_000,
      cashBurn: 1_500_000,
    },
    pipeline: {
      pipelineValue: 20_000_000,
      committedValue: 5_000_000,
      quotaTarget: 8_000_000,
      winRate: 0.3,
      avgDealSize: 75_000,
      avgCycleDays: 60,
      opportunitiesCreated: 300,
    },
    headcount: { sales: 40, total: 180 },
    ...over,
  };
}

describe("composeBoardPackage — revenue metrics", () => {
  it("computes NRR = (start + expansion - contraction - churn) / start", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    // (10M + 0.8M - 0.2M - 1.1M) / 10M = 0.95
    expect(pack.revenue.nrr.value).toBeCloseTo(0.95, 4);
  });

  it("computes GRR = (start - contraction - churn) / start", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    // (10M - 0.2M - 1.1M) / 10M = 0.87
    expect(pack.revenue.grr.value).toBeCloseTo(0.87, 4);
  });

  it("logo churn rate = logosChurned / logosStart", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    expect(pack.revenue.logoChurnRate.value).toBeCloseTo(10 / 200, 6);
  });

  it("net-new ARR = end - start", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    expect(pack.revenue.netNewArr.value).toBe(2_000_000);
  });
});

describe("composeBoardPackage — efficiency metrics", () => {
  it("LTV:CAC is finite and positive", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    expect(Number.isFinite(pack.efficiency.ltvToCac.value)).toBe(true);
    expect(pack.efficiency.ltvToCac.value).toBeGreaterThan(0);
  });

  it("magic number uses quarterly ARR delta × 4 over prior S&M spend", () => {
    const prior = snap({
      label: "Q4-2025",
      revenue: {
        startArr: 9_000_000,
        endArr: 10_000_000,
        newArr: 1_500_000,
        expansionArr: 500_000,
        contractionArr: 100_000,
        churnedArr: 400_000,
        logosStart: 180,
        logosChurned: 8,
      },
      costs: {
        salesAndMarketingCost: 1_000_000,
        rdCost: 800_000,
        gaCost: 350_000,
        cogs: 1_300_000,
        cashBurn: 1_400_000,
      },
    });
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
      prior,
    });
    // (12M - 10M) * 4 / 1M = 8
    expect(pack.efficiency.magicNumber.value).toBeCloseTo(8, 4);
  });

  it("burn multiple = cashBurn / net-new ARR", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    expect(pack.efficiency.burnMultiple.value).toBeCloseTo(1_500_000 / 2_000_000, 4);
  });

  it("rule of 40 = growth rate + operating margin", () => {
    const prior = snap({
      label: "Q4-2025",
      revenue: { ...snap().revenue, endArr: 10_000_000 },
    });
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
      prior,
    });
    // Growth = (12M - 10M) / 10M = 0.2
    // OpMargin = (12M - (1.2M + 0.9M + 0.4M + 1.5M)) / 12M = 8M / 12M ≈ 0.6667
    expect(pack.efficiency.ruleOf40.value).toBeCloseTo(0.2 + 0.6667, 3);
  });
});

describe("composeBoardPackage — pipeline", () => {
  it("coverage = pipelineValue / quotaTarget", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    expect(pack.pipeline.coverageRatio.value).toBeCloseTo(20_000_000 / 8_000_000, 4);
  });

  it("sales velocity = opps * winRate * avgDealSize / avgCycleDays", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    expect(pack.pipeline.salesVelocity.value).toBeCloseTo((300 * 0.3 * 75_000) / 60, 2);
  });
});

describe("composeBoardPackage — comparisons", () => {
  it("vsPrior direction is 'up' when current > prior by > 2%", () => {
    const prior = snap({
      label: "Q4-2025",
      revenue: { ...snap().revenue, endArr: 10_000_000 },
    });
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
      prior,
    });
    expect(pack.revenue.arrEnd.vsPrior?.direction).toBe("up");
  });

  it("vsYearAgo included when yearAgo supplied", () => {
    const yearAgo = snap({
      label: "Q1-2025",
      revenue: { ...snap().revenue, endArr: 6_000_000 },
    });
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
      yearAgo,
    });
    expect(pack.revenue.arrEnd.vsYearAgo).toBeDefined();
    expect(pack.revenue.arrEnd.vsYearAgo!.direction).toBe("up");
  });
});

describe("composeBoardPackage — narrative", () => {
  it("headline mentions ARR and NRR", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    expect(pack.headline).toContain("ARR");
    expect(pack.headline).toContain("NRR");
  });

  it("callouts flag low NRR", () => {
    const bad = snap({
      revenue: {
        ...snap().revenue,
        churnedArr: 2_500_000,
      },
    });
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: bad,
    });
    expect(pack.callouts.some((c) => /NRR/.test(c))).toBe(true);
  });

  it("callouts flag weak coverage below 2.5x", () => {
    const bad = snap({
      pipeline: { ...snap().pipeline, pipelineValue: 5_000_000, quotaTarget: 8_000_000 },
    });
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: bad,
    });
    expect(pack.callouts.some((c) => /coverage/i.test(c))).toBe(true);
  });
});

describe("flattenBoardPackage", () => {
  it("returns a non-empty list of KpiValue", () => {
    const pack = composeBoardPackage({
      company: { name: "Acme", currency: "USD" },
      current: snap(),
    });
    const flat = flattenBoardPackage(pack);
    expect(flat.length).toBeGreaterThan(10);
    expect(flat.every((k) => typeof k.code === "string" && typeof k.value === "number")).toBe(true);
  });
});
