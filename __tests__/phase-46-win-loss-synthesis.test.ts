/**
 * Phase 46 — Win/loss cohort synthesizer.
 */

import { describe, it, expect } from "vitest";
import {
  synthesizeWinLoss,
  type CohortDeal,
} from "../src/lib/sales/win-loss-synthesis";
import type { WinLossResult } from "../src/lib/sales/win-loss-extractor";

function wl(over: Partial<WinLossResult>): WinLossResult {
  return {
    outcome: "lost",
    primaryReason: "price_too_high",
    secondaryReasons: [],
    winningCompetitor: null,
    confidence: 0.7,
    matchedSignals: [],
    ...over,
  };
}

function deal(over: Partial<CohortDeal>): CohortDeal {
  return {
    dealId: "d1",
    outcome: "lost",
    amount: 100_000,
    reasons: wl({}),
    ...over,
  };
}

describe("synthesizeWinLoss — overall", () => {
  it("counts win/loss and computes winRate", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "w1", outcome: "won", reasons: wl({ outcome: "won", primaryReason: "feature_fit" }) }),
      deal({ dealId: "w2", outcome: "won", reasons: wl({ outcome: "won", primaryReason: "feature_fit" }) }),
      deal({ dealId: "l1", outcome: "lost", reasons: wl({ primaryReason: "price_too_high" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    expect(r.overall.dealCount).toBe(3);
    expect(r.overall.wonCount).toBe(2);
    expect(r.overall.lostCount).toBe(1);
    expect(r.overall.winRate).toBeCloseTo(2 / 3, 4);
  });

  it("top reasons sorted by count desc", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "l1", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "l2", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "l3", reasons: wl({ primaryReason: "missing_feature" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    expect(r.overall.topLossReasons[0].reason).toBe("price_too_high");
    expect(r.overall.topLossReasons[0].count).toBe(2);
  });
});

describe("synthesizeWinLoss — slicing", () => {
  it("slices by industry", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "a", industry: "fintech", outcome: "won", reasons: wl({ outcome: "won", primaryReason: "feature_fit" }) }),
      deal({ dealId: "b", industry: "fintech", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "c", industry: "healthtech", reasons: wl({ primaryReason: "compliance_blocker" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    const fintech = r.byIndustry.find((s) => s.key === "fintech");
    expect(fintech?.dealCount).toBe(2);
    expect(fintech?.winRate).toBeCloseTo(0.5, 4);
  });

  it("slices by segment", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "a", segment: "enterprise" }),
      deal({ dealId: "b", segment: "enterprise" }),
      deal({ dealId: "c", segment: "smb" }),
    ];
    const r = synthesizeWinLoss({ current });
    expect(r.bySegment.find((s) => s.key === "enterprise")?.dealCount).toBe(2);
    expect(r.bySegment.find((s) => s.key === "smb")?.dealCount).toBe(1);
  });

  it("byStageLost only includes losses", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "l", outcome: "lost", stageLost: "proposal" }),
      deal({ dealId: "w", outcome: "won", stageLost: "proposal", reasons: wl({ outcome: "won", primaryReason: "feature_fit" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    const proposal = r.byStageLost.find((s) => s.key === "proposal");
    expect(proposal?.dealCount).toBe(1);
    expect(proposal?.lostCount).toBe(1);
  });
});

describe("synthesizeWinLoss — competitor analysis", () => {
  it("groups losses by competitor and ranks by total lost amount", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "l1", amount: 200_000, competitor: "salesforce", reasons: wl({ primaryReason: "competitor_won", winningCompetitor: "salesforce" }) }),
      deal({ dealId: "l2", amount: 150_000, competitor: "salesforce", reasons: wl({ primaryReason: "competitor_won", winningCompetitor: "salesforce" }) }),
      deal({ dealId: "l3", amount: 50_000, competitor: "hubspot", reasons: wl({ primaryReason: "competitor_won", winningCompetitor: "hubspot" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    expect(r.byCompetitor[0].competitor).toBe("salesforce");
    expect(r.byCompetitor[0].lossCount).toBe(2);
    expect(r.byCompetitor[0].totalLostAmount).toBe(350_000);
  });

  it("uses reasons.winningCompetitor when competitor field absent", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "l1", reasons: wl({ primaryReason: "competitor_won", winningCompetitor: "monday" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    expect(r.byCompetitor[0].competitor).toBe("monday");
  });
});

describe("synthesizeWinLoss — theme deltas", () => {
  it("marks emerging vs fading between current and prior", () => {
    const prior: CohortDeal[] = [
      deal({ dealId: "p1", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "p2", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "p3", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "p4", reasons: wl({ primaryReason: "price_too_high" }) }),
    ];
    const current: CohortDeal[] = [
      deal({ dealId: "c1", reasons: wl({ primaryReason: "missing_feature" }) }),
      deal({ dealId: "c2", reasons: wl({ primaryReason: "missing_feature" }) }),
      deal({ dealId: "c3", reasons: wl({ primaryReason: "missing_feature" }) }),
      deal({ dealId: "c4", reasons: wl({ primaryReason: "price_too_high" }) }),
    ];
    const r = synthesizeWinLoss({ current, prior });
    const emerging = r.themeDeltas.find((d) => d.reason === "missing_feature" && d.outcome === "lost");
    const fading = r.themeDeltas.find((d) => d.reason === "price_too_high" && d.outcome === "lost");
    expect(emerging?.trend).toBe("emerging");
    expect(fading?.trend).toBe("fading");
  });

  it("stable trend when small delta", () => {
    const prior: CohortDeal[] = [
      deal({ dealId: "p1", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "p2", reasons: wl({ primaryReason: "missing_feature" }) }),
    ];
    const current: CohortDeal[] = [
      deal({ dealId: "c1", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "c2", reasons: wl({ primaryReason: "missing_feature" }) }),
    ];
    const r = synthesizeWinLoss({ current, prior });
    const price = r.themeDeltas.find((d) => d.reason === "price_too_high" && d.outcome === "lost");
    expect(price?.trend).toBe("stable");
  });
});

describe("synthesizeWinLoss — recommendations", () => {
  it("triggers price-defense when price_too_high dominant", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "l1", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "l2", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "l3", reasons: wl({ primaryReason: "price_too_high" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    expect(r.recommendations.some((rec) => rec.id === "price-defense")).toBe(true);
  });

  it("triggers competitive-playbook when competitor_won present", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "l1", reasons: wl({ primaryReason: "competitor_won", winningCompetitor: "salesforce" }) }),
      deal({ dealId: "l2", reasons: wl({ primaryReason: "competitor_won", winningCompetitor: "hubspot" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    expect(r.recommendations.some((rec) => rec.id === "competitive-playbook")).toBe(true);
  });

  it("recommendations sorted by impactScore desc", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "l1", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "l2", reasons: wl({ primaryReason: "price_too_high" }) }),
      deal({ dealId: "l3", reasons: wl({ primaryReason: "ghosted" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    for (let i = 1; i < r.recommendations.length; i++) {
      expect(r.recommendations[i - 1].impactScore).toBeGreaterThanOrEqual(r.recommendations[i].impactScore);
    }
  });

  it("no recommendations when no dominant theme", () => {
    const current: CohortDeal[] = [
      deal({ dealId: "w1", outcome: "won", reasons: wl({ outcome: "won", primaryReason: "relationship_trust" }) }),
    ];
    const r = synthesizeWinLoss({ current });
    // relationship_trust has no seed — zero recommendations
    expect(r.recommendations).toEqual([]);
  });
});

describe("synthesizeWinLoss — empty inputs", () => {
  it("empty cohort returns zeroed overall + no slices", () => {
    const r = synthesizeWinLoss({ current: [] });
    expect(r.overall.dealCount).toBe(0);
    expect(r.overall.winRate).toBe(0);
    expect(r.byCompetitor).toEqual([]);
    expect(r.recommendations).toEqual([]);
  });
});
