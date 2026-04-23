/**
 * Phase 41 — Customer health + expansion detector.
 */

import { describe, it, expect } from "vitest";
import {
  scoreAccountHealth,
  computeCohortNrr,
  type AccountHealthSnapshot,
  type CohortRevenueDelta,
} from "../src/lib/sales/customer-health";

function snap(over: Partial<AccountHealthSnapshot> = {}): AccountHealthSnapshot {
  return {
    accountId: "acct-1",
    asOf: "2026-04-22T12:00:00.000Z",
    usage: {
      dau: 80,
      mau: 160,
      licensesEnabled: 100,
      licensesActive: 85,
      keyEventsLast30d: 350,
      featureBreadthPct: 0.75,
      trendLast30vsPrior30: 0.1,
    },
    engagement: {
      avgResponseHours: 4,
      attendedLastQbr: true,
      trainingSessionsLast90d: 2,
      communityPostsLast90d: 1,
    },
    support: {
      openTickets: 2,
      criticalOpenTickets: 0,
      p1TicketsLast90d: 0,
      avgResolutionHoursLast90d: 18,
      sentimentScore: 0.4,
    },
    commercial: {
      contractedMrr: 20_000,
      actualUsageRatio: 1.05,
      invoicesOverdueCount: 0,
      renewalInDays: 120,
    },
    relationship: {
      hasExecSponsor: true,
      championStillInRole: true,
      lastQbrDaysAgo: 45,
      npsLast90d: 60,
      stakeholderCount: 5,
      lastSubstantiveTouchDaysAgo: 10,
    },
    ...over,
  };
}

describe("scoreAccountHealth — healthy baseline", () => {
  it("healthy account scores >=75 and status=healthy", () => {
    const r = scoreAccountHealth(snap());
    expect(r.status).toBe("healthy");
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.churnRisk).toBeLessThan(0.3);
  });

  it("healthy+expansion account gets expansion_play or advocate playbook", () => {
    const r = scoreAccountHealth(snap({
      commercial: {
        contractedMrr: 20_000,
        actualUsageRatio: 1.3,
        invoicesOverdueCount: 0,
        renewalInDays: 120,
      },
      usage: {
        dau: 80,
        mau: 160,
        licensesEnabled: 100,
        licensesActive: 95,
        keyEventsLast30d: 500,
        featureBreadthPct: 0.85,
        trendLast30vsPrior30: 0.25,
      },
    }));
    expect(["advocate", "expansion_play"]).toContain(r.playbook);
    expect(r.expansionSignal).toBeGreaterThan(0.4);
  });
});

describe("scoreAccountHealth — at-risk signals", () => {
  it("champion left + usage down + detractor NPS flips to at_risk/critical", () => {
    const r = scoreAccountHealth(snap({
      usage: {
        dau: 10,
        mau: 100,
        licensesEnabled: 100,
        licensesActive: 25,
        keyEventsLast30d: 40,
        featureBreadthPct: 0.2,
        trendLast30vsPrior30: -0.4,
      },
      relationship: {
        hasExecSponsor: false,
        championStillInRole: false,
        lastQbrDaysAgo: 200,
        npsLast90d: -20,
        stakeholderCount: 1,
        lastSubstantiveTouchDaysAgo: 90,
      },
    }));
    expect(["at_risk", "critical"]).toContain(r.status);
    expect(r.churnRisk).toBeGreaterThan(0.5);
    expect(r.playbook === "save_play" || r.playbook === "exit_intervention").toBe(true);
  });

  it("P1 tickets open drop the support pillar", () => {
    const baseline = scoreAccountHealth(snap());
    const withP1 = scoreAccountHealth(snap({
      support: {
        openTickets: 3,
        criticalOpenTickets: 2,
        p1TicketsLast90d: 3,
        avgResolutionHoursLast90d: 80,
        sentimentScore: -0.3,
      },
    }));
    expect(withP1.pillars.support.score).toBeLessThan(baseline.pillars.support.score);
  });

  it("overdue invoices increase churn risk", () => {
    const baseline = scoreAccountHealth(snap());
    const overdue = scoreAccountHealth(snap({
      commercial: {
        contractedMrr: 20_000,
        actualUsageRatio: 1.0,
        invoicesOverdueCount: 3,
        renewalInDays: 120,
      },
    }));
    expect(overdue.churnRisk).toBeGreaterThan(baseline.churnRisk);
  });
});

describe("scoreAccountHealth — pillar components", () => {
  it("exposes drivers and risks per pillar", () => {
    const r = scoreAccountHealth(snap());
    expect(r.pillars.usage.drivers.length).toBeGreaterThan(0);
    expect(r.pillars.relationship.drivers.length).toBeGreaterThan(0);
  });

  it("includes top drivers and risks at top-level", () => {
    const r = scoreAccountHealth(snap());
    expect(r.topDrivers.length).toBeGreaterThan(0);
    expect(r.topDrivers.length).toBeLessThanOrEqual(5);
  });
});

describe("scoreAccountHealth — renewal confidence", () => {
  it("high score + low churn + some expansion → high renewal confidence", () => {
    const r = scoreAccountHealth(snap());
    expect(r.renewalConfidence).toBeGreaterThan(0.6);
  });

  it("critical account has low renewal confidence", () => {
    const r = scoreAccountHealth(snap({
      usage: {
        dau: 5,
        mau: 100,
        licensesEnabled: 100,
        licensesActive: 10,
        keyEventsLast30d: 10,
        featureBreadthPct: 0.1,
        trendLast30vsPrior30: -0.5,
      },
      relationship: {
        hasExecSponsor: false,
        championStillInRole: false,
        lastQbrDaysAgo: null,
        npsLast90d: -50,
        stakeholderCount: 1,
        lastSubstantiveTouchDaysAgo: 120,
      },
      support: {
        openTickets: 15,
        criticalOpenTickets: 3,
        p1TicketsLast90d: 5,
        avgResolutionHoursLast90d: 100,
        sentimentScore: -0.7,
      },
    }));
    expect(r.renewalConfidence).toBeLessThan(0.3);
  });
});

describe("computeCohortNrr", () => {
  it("NRR = (start + expansion - contraction - churn) / start", () => {
    const deltas: CohortRevenueDelta[] = [
      { accountId: "a", startMrr: 10_000, expansionMrr: 2_000, contractionMrr: 0, churnedMrr: 0 },
      { accountId: "b", startMrr: 20_000, expansionMrr: 0, contractionMrr: 1_000, churnedMrr: 0 },
      { accountId: "c", startMrr: 5_000, expansionMrr: 0, contractionMrr: 0, churnedMrr: 5_000 },
    ];
    const r = computeCohortNrr(deltas);
    // start = 35k, exp = 2k, contract = 1k, churn = 5k, end = 31k
    expect(r.startMrr).toBe(35_000);
    expect(r.endMrr).toBe(31_000);
    expect(r.nrr).toBeCloseTo(31_000 / 35_000, 4);
    expect(r.grr).toBeCloseTo((35_000 - 1_000 - 5_000) / 35_000, 4);
    expect(r.logoChurnCount).toBe(1);
    expect(r.logoChurnRate).toBeCloseTo(1 / 3, 3);
  });

  it("NRR > 100% when expansion outpaces churn", () => {
    const deltas: CohortRevenueDelta[] = [
      { accountId: "a", startMrr: 10_000, expansionMrr: 5_000, contractionMrr: 0, churnedMrr: 0 },
      { accountId: "b", startMrr: 10_000, expansionMrr: 3_000, contractionMrr: 500, churnedMrr: 0 },
    ];
    const r = computeCohortNrr(deltas);
    expect(r.nrr).toBeGreaterThan(1);
  });

  it("empty cohort returns zeroes", () => {
    const r = computeCohortNrr([]);
    expect(r.startMrr).toBe(0);
    expect(r.nrr).toBe(0);
    expect(r.grr).toBe(0);
  });
});
