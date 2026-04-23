/**
 * Phase 48 — Executive revenue dashboard model.
 */

import { describe, it, expect } from "vitest";
import {
  buildExecDashboard,
  type ExecDashboardInput,
  type DashboardDealRecord,
  type DashboardAccountRecord,
} from "../src/lib/sales/exec-dashboard";
import type { ForecastRollup } from "../src/lib/sales/forecast-confidence";
import type { HealthScore } from "../src/lib/sales/customer-health";
import type { DiscountEvaluation } from "../src/lib/sales/discount-governance";
import type { AttributionResult } from "../src/lib/sales/attribution-engine";

function baseForecast(): ForecastRollup {
  return {
    period: "Q2-2026",
    total: { expected: 2_500_000, stdDev: 400_000, p10: 1_900_000, p50: 2_500_000, p90: 3_100_000, count: 25, totalAmount: 4_000_000 },
    byCategory: {
      commit: { count: 5, amount: 1_200_000, expected: 1_000_000, avgProbability: 0.85 },
      best_case: { count: 7, amount: 1_500_000, expected: 900_000, avgProbability: 0.6 },
      pipeline: { count: 10, amount: 1_800_000, expected: 540_000, avgProbability: 0.3 },
      omitted: { count: 3, amount: 500_000, expected: 60_000, avgProbability: 0.12 },
    },
    byOwner: [],
    commitCoverage: 1.0,
    bestCaseCoverage: 0.9,
    recommendedCallNumber: 2_100_000,
  };
}

function healthyHealth(id: string, expansion = 0.2, churn = 0.1): HealthScore {
  return {
    accountId: id,
    score: 85,
    status: "healthy",
    pillars: {
      usage: { score: 85, drivers: ["usage_strong"], risks: [], weight: 0.3 } as any,
      engagement: { score: 80, drivers: [], risks: [], weight: 0.15 } as any,
      support: { score: 90, drivers: [], risks: [], weight: 0.15 } as any,
      commercial: { score: 88, drivers: [], risks: [], weight: 0.2 } as any,
      relationship: { score: 82, drivers: [], risks: [], weight: 0.2 } as any,
    },
    churnRisk: churn,
    expansionSignal: expansion,
    renewalConfidence: 0.85,
    playbook: expansion > 0.5 ? "expansion_play" : "advocate",
    topDrivers: ["usage_strong"],
    topRisks: [],
  };
}

function atRiskHealth(id: string): HealthScore {
  return {
    accountId: id,
    score: 35,
    status: "at_risk",
    pillars: {
      usage: { score: 20, drivers: [], risks: ["usage_down"], weight: 0.3 } as any,
      engagement: { score: 30, drivers: [], risks: [], weight: 0.15 } as any,
      support: { score: 25, drivers: [], risks: ["p1_open"], weight: 0.15 } as any,
      commercial: { score: 50, drivers: [], risks: [], weight: 0.2 } as any,
      relationship: { score: 30, drivers: [], risks: ["champion_left"], weight: 0.2 } as any,
    },
    churnRisk: 0.7,
    expansionSignal: 0,
    renewalConfidence: 0.2,
    playbook: "save_play",
    topDrivers: [],
    topRisks: ["usage_down", "champion_left", "p1_open"],
  };
}

describe("buildExecDashboard — pipeline coverage", () => {
  it("computes coverage ratio and flags critical when <1.5x", () => {
    const fc = baseForecast();
    const input: ExecDashboardInput = {
      period: { label: "Q2-2026", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 2_000_000 },
      forecast: fc,
    };
    const d = buildExecDashboard(input);
    expect(d.pipelineCoverage).toBeDefined();
    // total = 1M + 900k + 540k = 2.44M; ratio = 1.22; <1.5 => critical
    expect(d.pipelineCoverage!.coverageRatio).toBeCloseTo(2_440_000 / 2_000_000, 3);
    expect(d.pipelineCoverage!.status).toBe("critical");
  });

  it("on_track when coverage >2.5x", () => {
    const fc = baseForecast();
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 500_000 },
      forecast: fc,
    });
    expect(d.pipelineCoverage!.status).toBe("on_track");
  });
});

describe("buildExecDashboard — forecast summary", () => {
  it("exposes p10/p50/p90 from total interval", () => {
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 2_000_000 },
      forecast: baseForecast(),
    });
    expect(d.forecastSummary!.p10).toBe(1_900_000);
    expect(d.forecastSummary!.p50).toBe(2_500_000);
    expect(d.forecastSummary!.p90).toBe(3_100_000);
  });

  it("quotaAttainmentPct = (commit + bestCase) / quota", () => {
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 2_000_000 },
      forecast: baseForecast(),
    });
    expect(d.forecastSummary!.quotaAttainmentPct).toBeCloseTo((1_000_000 + 900_000) / 2_000_000, 3);
  });
});

describe("buildExecDashboard — deals at risk", () => {
  it("flags stalled low-win-prob deals", () => {
    const deals: DashboardDealRecord[] = [
      { dealId: "hot", name: "Hot Deal", amount: 500_000, stage: "negotiation", winProbability: 0.8 },
      { dealId: "cold", name: "Cold Deal", amount: 400_000, stage: "proposal", winProbability: 0.1, isStalled: true },
      { dealId: "warm", name: "Warm", amount: 100_000, stage: "discovery", winProbability: 0.5 },
    ];
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 1_000_000 },
      deals,
    });
    expect(d.dealsAtRisk[0].dealId).toBe("cold");
    expect(d.dealsAtRisk[0].risks).toContain("stalled");
  });

  it("omits low-risk deals from at-risk list", () => {
    const deals: DashboardDealRecord[] = [
      { dealId: "safe", name: "Safe", amount: 500_000, stage: "verbal_commit", winProbability: 0.9 },
    ];
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 1_000_000 },
      deals,
    });
    expect(d.dealsAtRisk).toEqual([]);
  });
});

describe("buildExecDashboard — growth & churn", () => {
  it("ranks expansion candidates by expansionSignal × MRR", () => {
    const accounts: DashboardAccountRecord[] = [
      { accountId: "a", name: "Alpha", mrr: 10_000, health: healthyHealth("a", 0.8) },
      { accountId: "b", name: "Beta", mrr: 50_000, health: healthyHealth("b", 0.6) },
      { accountId: "c", name: "Gamma", mrr: 5_000, health: healthyHealth("c", 0.2) },
    ];
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 1_000_000 },
      accounts,
    });
    // beta has expansion 0.6 × 50k = 30k; alpha 0.8 × 10k = 8k; beta wins
    expect(d.topGrowthAccounts[0].accountId).toBe("b");
  });

  it("ranks churn risks by churnRisk × MRR", () => {
    const accounts: DashboardAccountRecord[] = [
      { accountId: "a", name: "Alpha", mrr: 100_000, health: atRiskHealth("a") },
      { accountId: "b", name: "Beta", mrr: 10_000, health: atRiskHealth("b") },
    ];
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 1_000_000 },
      accounts,
    });
    expect(d.topChurnRisks[0].accountId).toBe("a");
  });

  it("healthMixPct sums to 1", () => {
    const accounts: DashboardAccountRecord[] = [
      { accountId: "a", name: "Alpha", mrr: 10_000, health: healthyHealth("a") },
      { accountId: "b", name: "Beta", mrr: 10_000, health: atRiskHealth("b") },
    ];
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 1_000_000 },
      accounts,
    });
    const sum = d.healthMixPct.healthy + d.healthMixPct.monitoring + d.healthMixPct.at_risk + d.healthMixPct.critical;
    expect(sum).toBeCloseTo(1, 4);
  });
});

describe("buildExecDashboard — discount leakage", () => {
  it("summarizes leakage with critical + worst-offenders", () => {
    const evs: DiscountEvaluation[] = [
      {
        dealId: "a",
        listPrice: 100_000,
        quotedPrice: 70_000,
        grossDiscountPct: 0.3,
        effectiveDiscountPct: 0.3,
        approvalRequired: "director",
        marginPct: 0.4,
        decision: "needs_approval",
        flags: [{ code: "short_term_deep_discount", severity: "warning", message: "" } as any],
        narrative: "",
      },
      {
        dealId: "b",
        listPrice: 100_000,
        quotedPrice: 30_000,
        grossDiscountPct: 0.7,
        effectiveDiscountPct: 0.7,
        approvalRequired: "ceo",
        marginPct: 0.2,
        decision: "reject",
        flags: [{ code: "hard_floor_breach", severity: "critical", message: "" } as any],
        narrative: "",
      },
    ];
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 1_000_000 },
      discountEvaluations: evs,
    });
    expect(d.discountLeakage!.totalLeakage).toBe(30_000 + 70_000);
    expect(d.discountLeakage!.criticalCount).toBe(1);
    expect(d.discountLeakage!.worstOffenders[0].dealId).toBe("b");
  });
});

describe("buildExecDashboard — attribution & NRR", () => {
  it("passes through attribution top channels", () => {
    const att: AttributionResult = {
      model: "linear",
      outcomeValue: 100_000,
      allocations: [],
      channelSummary: [
        { channel: "paid_search" as any, credit: 40_000, share: 0.4, touchCount: 3 },
        { channel: "webinar" as any, credit: 30_000, share: 0.3, touchCount: 2 },
        { channel: "outbound_email" as any, credit: 30_000, share: 0.3, touchCount: 2 },
      ],
    };
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 1_000_000 },
      attribution: att,
    });
    expect(d.attributionSummary!.totalAttributedValue).toBe(100_000);
    expect(d.attributionSummary!.topChannels[0].channel).toBe("paid_search");
  });

  it("summarizes NRR from cohort report", () => {
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 1_000_000 },
      nrr: {
        startMrr: 100_000,
        expansionMrr: 15_000,
        contractionMrr: 5_000,
        churnedMrr: 2_000,
        endMrr: 108_000,
        nrr: 1.08,
        grr: 0.93,
        logoChurnCount: 1,
        logoChurnRate: 0.05,
      },
    });
    expect(d.nrrSummary!.nrr).toBeCloseTo(1.08, 4);
    expect(d.nrrSummary!.netNewMrr).toBe(8_000);
  });
});

describe("buildExecDashboard — headline", () => {
  it("builds a concise headline string", () => {
    const d = buildExecDashboard({
      period: { label: "Q2-2026", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 2_000_000 },
      forecast: baseForecast(),
      nrr: {
        startMrr: 100_000, expansionMrr: 10_000, contractionMrr: 0, churnedMrr: 0, endMrr: 110_000,
        nrr: 1.1, grr: 1.0, logoChurnCount: 0, logoChurnRate: 0,
      },
    });
    expect(d.headline).toContain("Q2-2026");
    expect(d.headline).toContain("NRR 110%");
  });
});

describe("buildExecDashboard — empty input", () => {
  it("still returns a valid skeleton for quotaTarget-only input", () => {
    const d = buildExecDashboard({
      period: { label: "Q2", startIso: "2026-04-01", endIso: "2026-06-30", quotaTarget: 1_000_000 },
    });
    expect(d.dealsAtRisk).toEqual([]);
    expect(d.topGrowthAccounts).toEqual([]);
    expect(d.topChurnRisks).toEqual([]);
    expect(d.pipelineCoverage).toBeUndefined();
    expect(d.headline).toContain("Q2");
  });
});
