/**
 * Phase 49 — Deal win simulator.
 */

import { describe, it, expect } from "vitest";
import {
  simulateWinPath,
  simulatePortfolio,
  DEFAULT_INTERVENTION_CATALOG,
} from "../src/lib/sales/deal-win-simulator";
import type { WinProbDealSnapshot } from "../src/lib/sales/win-probability";

function baseDeal(over: Partial<WinProbDealSnapshot> = {}): WinProbDealSnapshot {
  return {
    id: "d1",
    amount: 100_000,
    stage: "proposal",
    ageDays: 30,
    daysSinceLastActivity: 3,
    daysToCloseDate: 20,
    closeDatePushCount: 0,
    stakeholderCount: 2,
    championIdentified: false,
    economicBuyerEngaged: false,
    blockerIdentified: false,
    competitorInDeal: false,
    mutualActionPlanExists: false,
    ...over,
  };
}

describe("simulateWinPath — basics", () => {
  it("returns baseline probability and a headline for a generic deal", () => {
    const sim = simulateWinPath(baseDeal());
    expect(sim.baseProbability).toBeGreaterThan(0);
    expect(sim.baseProbability).toBeLessThan(1);
    expect(sim.headline.length).toBeGreaterThan(0);
    expect(sim.dealId).toBe("d1");
  });

  it("proposes champion & EB interventions when neither is present", () => {
    const sim = simulateWinPath(baseDeal());
    const codes = sim.ranked.map((r) => r.intervention.code);
    expect(codes).toContain("identify_champion");
    expect(codes).toContain("engage_economic_buyer");
  });

  it("skips interventions that are already satisfied", () => {
    const sim = simulateWinPath(
      baseDeal({
        championIdentified: true,
        economicBuyerEngaged: true,
        mutualActionPlanExists: true,
      }),
    );
    const codes = sim.ranked.map((r) => r.intervention.code);
    expect(codes).not.toContain("identify_champion");
    expect(codes).not.toContain("engage_economic_buyer");
    expect(codes).not.toContain("build_mutual_plan");
  });

  it("terminal stages produce no interventions", () => {
    const won = simulateWinPath(baseDeal({ stage: "closed_won" }));
    expect(won.baseProbability).toBe(1);
    expect(won.ranked).toEqual([]);
    expect(won.recommendedPath).toEqual([]);
    expect(won.headline).toMatch(/already won/i);

    const lost = simulateWinPath(baseDeal({ stage: "closed_lost" }));
    expect(lost.baseProbability).toBe(0);
    expect(lost.ranked).toEqual([]);
    expect(lost.headline).toMatch(/already lost/i);
  });
});

describe("simulateWinPath — ranking", () => {
  it("ranks interventions by ROI (lift per effort-hour)", () => {
    const sim = simulateWinPath(baseDeal());
    for (let i = 1; i < sim.ranked.length; i++) {
      expect(sim.ranked[i - 1].roi).toBeGreaterThanOrEqual(sim.ranked[i].roi);
    }
  });

  it("absoluteLift is non-negative for applicable interventions", () => {
    const sim = simulateWinPath(baseDeal());
    for (const r of sim.ranked) {
      expect(r.absoluteLift).toBeGreaterThanOrEqual(0);
    }
  });

  it("minAbsoluteLift filter drops low-impact interventions", () => {
    const sim = simulateWinPath(baseDeal(), { minAbsoluteLift: 0.1 });
    for (const r of sim.ranked) {
      expect(r.absoluteLift).toBeGreaterThanOrEqual(0.1);
    }
  });

  it("headline references the top intervention when meaningful lift exists", () => {
    const sim = simulateWinPath(baseDeal());
    const top = sim.ranked[0];
    if (top && top.absoluteLift >= 0.01) {
      expect(sim.headline).toContain(top.intervention.label);
    }
  });
});

describe("simulateWinPath — greedy path", () => {
  it("produces a monotone non-decreasing probability trajectory", () => {
    const sim = simulateWinPath(baseDeal());
    for (let i = 1; i < sim.recommendedPath.length; i++) {
      expect(sim.recommendedPath[i].probabilityBefore).toBeGreaterThanOrEqual(
        sim.recommendedPath[i - 1].probabilityBefore,
      );
      expect(sim.recommendedPath[i].probabilityAfter).toBeGreaterThanOrEqual(
        sim.recommendedPath[i].probabilityBefore,
      );
    }
  });

  it("does not repeat the same intervention", () => {
    const sim = simulateWinPath(baseDeal());
    const codes = sim.recommendedPath.map((s) => s.intervention.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("respects maxEffortHours budget", () => {
    const sim = simulateWinPath(baseDeal(), { maxEffortHours: 5 });
    expect(sim.totalEffortHours).toBeLessThanOrEqual(5);
  });

  it("finalProbability equals the last step's probabilityAfter", () => {
    const sim = simulateWinPath(baseDeal());
    if (sim.recommendedPath.length > 0) {
      const last = sim.recommendedPath[sim.recommendedPath.length - 1];
      expect(sim.finalProbability).toBeCloseTo(last.probabilityAfter, 6);
    } else {
      expect(sim.finalProbability).toBeCloseTo(sim.baseProbability, 6);
    }
  });

  it("empty path when no intervention clears the minLift threshold", () => {
    const strongDeal = baseDeal({
      championIdentified: true,
      economicBuyerEngaged: true,
      mutualActionPlanExists: true,
      salesAcceptedBudget: true,
      legalEngaged: true,
      procurementEngaged: true,
      stakeholderCount: 5,
    });
    const sim = simulateWinPath(strongDeal, { minAbsoluteLift: 0.5 });
    expect(sim.recommendedPath).toEqual([]);
    expect(sim.totalLift).toBe(0);
  });
});

describe("simulateWinPath — interventions change state", () => {
  it("removing blocker produces a positive lift when blocker is present", () => {
    const sim = simulateWinPath(baseDeal({ blockerIdentified: true }));
    const lift = sim.ranked.find((r) => r.intervention.code === "remove_blocker");
    expect(lift).toBeDefined();
    expect(lift!.absoluteLift).toBeGreaterThan(0);
  });

  it("reduce_discount only surfaces when requestedPct > 0.2", () => {
    const lowDiscount = simulateWinPath(baseDeal({ discountRequestedPct: 0.1 }));
    expect(lowDiscount.ranked.find((r) => r.intervention.code === "reduce_discount")).toBeUndefined();

    const highDiscount = simulateWinPath(baseDeal({ discountRequestedPct: 0.35 }));
    expect(highDiscount.ranked.find((r) => r.intervention.code === "reduce_discount")).toBeDefined();
  });

  it("re_engage_stalled fires only when idle > 10 days", () => {
    const fresh = simulateWinPath(baseDeal({ daysSinceLastActivity: 2 }));
    expect(fresh.ranked.find((r) => r.intervention.code === "re_engage_stalled")).toBeUndefined();

    const stalled = simulateWinPath(baseDeal({ daysSinceLastActivity: 20 }));
    expect(stalled.ranked.find((r) => r.intervention.code === "re_engage_stalled")).toBeDefined();
  });

  it("complete_poc only applicable when a POC exists and is incomplete", () => {
    const noPoc = simulateWinPath(baseDeal());
    expect(noPoc.ranked.find((r) => r.intervention.code === "complete_poc")).toBeUndefined();

    const openPoc = simulateWinPath(baseDeal({ poc: { completed: false, passed: false } }));
    expect(openPoc.ranked.find((r) => r.intervention.code === "complete_poc")).toBeDefined();
  });
});

describe("simulatePortfolio", () => {
  it("aggregates per-deal simulations and surfaces leverage ranking", () => {
    const deals: WinProbDealSnapshot[] = [
      baseDeal({ id: "small-fix", amount: 20_000, championIdentified: false }),
      baseDeal({ id: "big-fix", amount: 500_000, championIdentified: false }),
    ];
    const port = simulatePortfolio(deals);
    expect(port.totals.deals).toBe(2);
    expect(port.perDeal).toHaveLength(2);
    expect(port.leverageRanking).toHaveLength(2);
    // Higher amount should rank at or near the top because revenue lift scales with amount.
    expect(port.leverageRanking[0].dealId).toBe("big-fix");
  });

  it("totalProjectedExpected >= totalBaseExpected", () => {
    const deals = [
      baseDeal({ id: "a", championIdentified: false }),
      baseDeal({ id: "b", championIdentified: false, blockerIdentified: true }),
    ];
    const port = simulatePortfolio(deals);
    expect(port.totals.totalProjectedExpected).toBeGreaterThanOrEqual(
      port.totals.totalBaseExpected,
    );
  });

  it("empty portfolio produces zeroed totals", () => {
    const port = simulatePortfolio([]);
    expect(port.totals.deals).toBe(0);
    expect(port.totals.totalBaseExpected).toBe(0);
    expect(port.totals.totalRevenueLift).toBe(0);
    expect(port.leverageRanking).toEqual([]);
  });
});

describe("catalog invariants", () => {
  it("all catalog entries have positive effortHours and non-empty labels", () => {
    for (const iv of DEFAULT_INTERVENTION_CATALOG) {
      expect(iv.effortHours).toBeGreaterThan(0);
      expect(iv.label.length).toBeGreaterThan(0);
      expect(iv.rationale.length).toBeGreaterThan(0);
    }
  });

  it("catalog codes are unique", () => {
    const codes = DEFAULT_INTERVENTION_CATALOG.map((i) => i.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("apply functions never mutate the input snapshot", () => {
    const deal = baseDeal();
    const before = JSON.stringify(deal);
    for (const iv of DEFAULT_INTERVENTION_CATALOG) {
      if (iv.isApplicable(deal)) iv.apply(deal);
    }
    expect(JSON.stringify(deal)).toBe(before);
  });
});
