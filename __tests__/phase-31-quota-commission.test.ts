/**
 * Phase 31 — Quota + commission calculator.
 */

import { describe, it, expect } from "vitest";
import {
  calculateCommission,
  attainmentGrade,
  type CommissionPlan,
  type ClosedWonDeal,
} from "../src/lib/sales/quota-commission";

const PLAN: CommissionPlan = {
  id: "AE-2026",
  periodQuota: 1_000_000,
  commissionTargetAtQuota: 60_000,
  tiers: [
    { attainmentFrom: 0, attainmentTo: 0.5, rate: 0.04 },
    { attainmentFrom: 0.5, attainmentTo: 1.0, rate: 0.08 },
  ],
  accelerators: [
    { attainmentFrom: 1.0, attainmentTo: 1.5, rate: 0.12 },
    { attainmentFrom: 1.5, attainmentTo: null, rate: 0.16 },
  ],
};

function dealOf(id: string, amount: number, over: Partial<ClosedWonDeal> = {}): ClosedWonDeal {
  return {
    id,
    amount,
    currency: "USD",
    closedAt: "2026-04-15T00:00:00.000Z",
    ...over,
  };
}

describe("calculateCommission — tier walking", () => {
  it("zero revenue → zero commission", () => {
    const r = calculateCommission([], PLAN);
    expect(r.bookedRevenue).toBe(0);
    expect(r.totalCommission).toBe(0);
    expect(r.attainment).toBe(0);
  });

  it("revenue inside first tier uses first-tier rate", () => {
    const r = calculateCommission([dealOf("d1", 200_000)], PLAN);
    // 200k × 4% = 8,000
    expect(r.totalCommission).toBeCloseTo(8000, 2);
    expect(r.attainment).toBeCloseTo(0.2, 4);
  });

  it("revenue spanning two tiers splits correctly", () => {
    // 700k = 500k@4% + 200k@8% = 20k + 16k = 36k
    const r = calculateCommission([dealOf("d1", 700_000)], PLAN);
    expect(r.totalCommission).toBeCloseTo(36_000, 2);
  });

  it("revenue at quota uses full first + second tier", () => {
    // 1M = 500k@4% + 500k@8% = 20k + 40k = 60k  (matches commissionTargetAtQuota)
    const r = calculateCommission([dealOf("d1", 1_000_000)], PLAN);
    expect(r.totalCommission).toBeCloseTo(60_000, 2);
    expect(r.attainment).toBeCloseTo(1.0, 4);
  });

  it("accelerators pay above 100% attainment", () => {
    // 1.2M = 500k@4% + 500k@8% + 200k@12% = 20k + 40k + 24k = 84k
    const r = calculateCommission([dealOf("d1", 1_200_000)], PLAN);
    expect(r.totalCommission).toBeCloseTo(84_000, 2);
  });

  it("super-accelerator above 150% attainment", () => {
    // 1.6M = 500k@4% + 500k@8% + 500k@12% + 100k@16% = 20+40+60+16 = 136k
    const r = calculateCommission([dealOf("d1", 1_600_000)], PLAN);
    expect(r.totalCommission).toBeCloseTo(136_000, 2);
  });

  it("per-deal allocation is pro-rata", () => {
    // Two deals totalling 800k → 500k@4% + 300k@8% = 44k
    const r = calculateCommission(
      [dealOf("a", 600_000), dealOf("b", 200_000)],
      PLAN,
    );
    expect(r.totalCommission).toBeCloseTo(44_000, 2);
    const sumPerDeal = r.deals.reduce(
      (s, d) => s + d.baseCommission + d.spiffs.reduce((ss, x) => ss + x.amount, 0),
      0,
    );
    expect(sumPerDeal).toBeCloseTo(44_000, 2);
    // A gets 3× B's share
    expect(r.deals[0].baseCommission / r.deals[1].baseCommission).toBeCloseTo(3, 4);
  });
});

describe("calculateCommission — SPIFFs", () => {
  it("SPIFF adds per qualifying deal", () => {
    const plan: CommissionPlan = {
      ...PLAN,
      spiffs: [
        {
          name: "new-logo",
          matches: (d) => (d.tags ?? []).includes("new-logo"),
          amount: 500,
        },
      ],
    };
    const r = calculateCommission(
      [
        dealOf("a", 100_000, { tags: ["new-logo"] }),
        dealOf("b", 100_000),
      ],
      plan,
    );
    const spiffTotal = r.deals.reduce(
      (s, d) => s + d.spiffs.reduce((ss, x) => ss + x.amount, 0),
      0,
    );
    expect(spiffTotal).toBe(500);
  });

  it("multiple SPIFFs stack on same deal", () => {
    const plan: CommissionPlan = {
      ...PLAN,
      spiffs: [
        { name: "new-logo", matches: () => true, amount: 500 },
        { name: "multi-year", matches: () => true, amount: 1000 },
      ],
    };
    const r = calculateCommission([dealOf("a", 100_000)], plan);
    expect(r.deals[0].spiffs).toHaveLength(2);
    expect(r.deals[0].spiffs.reduce((s, x) => s + x.amount, 0)).toBe(1500);
  });
});

describe("calculateCommission — clawback hold", () => {
  it("unpaid deals hold the clawback fraction", () => {
    const plan: CommissionPlan = { ...PLAN, clawbackHoldFraction: 0.3 };
    const r = calculateCommission([dealOf("a", 100_000, { paid: false })], plan);
    // Commission = 4000 @ 4% tier. Held = 30% = 1200. Vested = 2800.
    expect(r.totalCommission).toBeCloseTo(4000, 2);
    expect(r.totalHeld).toBeCloseTo(1200, 2);
    expect(r.totalVested).toBeCloseTo(2800, 2);
  });

  it("paid deals have no hold", () => {
    const plan: CommissionPlan = { ...PLAN, clawbackHoldFraction: 0.3 };
    const r = calculateCommission([dealOf("a", 100_000, { paid: true })], plan);
    expect(r.totalHeld).toBe(0);
    expect(r.totalVested).toBeCloseTo(4000, 2);
  });
});

describe("calculateCommission — flat fallback", () => {
  it("empty tiers use flat rate derived from target/quota", () => {
    const plan: CommissionPlan = {
      id: "flat",
      periodQuota: 500_000,
      commissionTargetAtQuota: 50_000, // 10% flat
      tiers: [],
    };
    const r = calculateCommission([dealOf("a", 100_000)], plan);
    expect(r.totalCommission).toBeCloseTo(10_000, 2);
    expect(r.notes.some((n) => n.includes("flat fallback"))).toBe(true);
  });
});

describe("attainmentGrade", () => {
  it("buckets correctly", () => {
    expect(attainmentGrade(0.3)).toBe("below_threshold");
    expect(attainmentGrade(0.6)).toBe("ramping");
    expect(attainmentGrade(0.9)).toBe("on_track");
    expect(attainmentGrade(1.0)).toBe("at_quota");
    expect(attainmentGrade(1.3)).toBe("over_quota");
    expect(attainmentGrade(1.8)).toBe("president_club");
  });
});
