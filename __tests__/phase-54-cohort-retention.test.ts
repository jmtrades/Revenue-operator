/**
 * Phase 54 — Cohort retention & churn forecast.
 */
import { describe, it, expect } from "vitest";
import {
  composeRetentionReport,
  buildCohortCurves,
  predictAccountChurn,
  type AccountState,
} from "../src/lib/sales/cohort-retention";

const AS_OF = "2026-04-22T00:00:00.000Z";

function acct(over: Partial<AccountState> = {}): AccountState {
  return {
    accountId: "a1",
    segment: "mid_market",
    cohortStartIso: "2025-04-01T00:00:00.000Z",
    currentArr: 50_000,
    healthScore: 0.7,
    renewalConfidence: 0.7,
    usageTrend: 0.6,
    recentEscalations: 0,
    nps: 40,
    tenureMonths: 12,
    ...over,
  };
}

describe("buildCohortCurves — Kaplan-Meier", () => {
  it("returns 100% survival at month 0 for any cohort", () => {
    const curves = buildCohortCurves(
      [acct({ accountId: "a1" }), acct({ accountId: "a2" })],
      AS_OF,
    );
    expect(curves.length).toBe(1);
    expect(curves[0].points[0].survival).toBe(1);
  });

  it("groups by signup_month by default", () => {
    const curves = buildCohortCurves(
      [
        acct({ accountId: "a1", cohortStartIso: "2024-01-15T00:00:00.000Z" }),
        acct({ accountId: "a2", cohortStartIso: "2024-02-15T00:00:00.000Z" }),
      ],
      AS_OF,
    );
    expect(curves.map((c) => c.label).sort()).toEqual(["2024-01", "2024-02"]);
  });

  it("groups by segment when requested", () => {
    const curves = buildCohortCurves(
      [
        acct({ accountId: "a1", segment: "smb" }),
        acct({ accountId: "a2", segment: "enterprise" }),
        acct({ accountId: "a3", segment: "enterprise" }),
      ],
      AS_OF,
      "segment",
    );
    expect(curves.map((c) => c.label).sort()).toEqual(["enterprise", "smb"]);
  });

  it("reflects churn in survival curve", () => {
    const curves = buildCohortCurves(
      [
        acct({
          accountId: "a1",
          cohortStartIso: "2025-01-01T00:00:00.000Z",
          churnedAtIso: "2025-07-01T00:00:00.000Z",
        }),
        acct({
          accountId: "a2",
          cohortStartIso: "2025-01-01T00:00:00.000Z",
        }),
      ],
      AS_OF,
    );
    // By month 6, half churned — survival should drop to 0.5.
    const monthSix = curves[0].points.find((p) => p.tenureMonth === 6);
    expect(monthSix?.survival).toBeCloseTo(0.5, 4);
  });

  it("reports medianMonths when survival drops below 0.5", () => {
    const curves = buildCohortCurves(
      [
        acct({
          accountId: "a1",
          cohortStartIso: "2024-01-01T00:00:00.000Z",
          churnedAtIso: "2024-03-01T00:00:00.000Z",
        }),
        acct({
          accountId: "a2",
          cohortStartIso: "2024-01-01T00:00:00.000Z",
          churnedAtIso: "2024-04-01T00:00:00.000Z",
        }),
      ],
      AS_OF,
    );
    expect(curves[0].medianMonths).toBeDefined();
  });
});

describe("predictAccountChurn — logistic", () => {
  it("healthy account gets low churn probability", () => {
    const forecast = predictAccountChurn(
      acct({
        healthScore: 0.9,
        renewalConfidence: 0.9,
        usageTrend: 0.9,
        nps: 80,
        recentEscalations: 0,
      }),
      AS_OF,
      90,
    );
    expect(forecast.churnProbability).toBeLessThan(0.3);
  });

  it("at-risk account gets high churn probability", () => {
    const forecast = predictAccountChurn(
      acct({
        healthScore: 0.2,
        renewalConfidence: 0.2,
        usageTrend: 0.1,
        nps: -20,
        recentEscalations: 4,
        renewalDueIso: "2026-05-15T00:00:00.000Z",
      }),
      AS_OF,
      90,
    );
    expect(forecast.churnProbability).toBeGreaterThan(0.7);
    expect(forecast.topRiskFactors.length).toBeGreaterThan(0);
  });

  it("expectedArrLoss is probability × currentArr", () => {
    const forecast = predictAccountChurn(
      acct({
        currentArr: 100_000,
        healthScore: 0.2,
        renewalConfidence: 0.2,
      }),
      AS_OF,
      90,
    );
    const expected = Math.round(forecast.churnProbability * 100_000);
    expect(forecast.expectedArrLoss).toBe(expected);
  });

  it("renewal proximity inside horizon lifts churn probability", () => {
    const noRenewal = predictAccountChurn(
      acct({ healthScore: 0.5, renewalConfidence: 0.5 }),
      AS_OF,
      90,
    );
    const withRenewal = predictAccountChurn(
      acct({
        healthScore: 0.5,
        renewalConfidence: 0.5,
        renewalDueIso: "2026-05-20T00:00:00.000Z",
      }),
      AS_OF,
      90,
    );
    expect(withRenewal.churnProbability).toBeGreaterThan(noRenewal.churnProbability);
  });
});

describe("composeRetentionReport", () => {
  const accounts: AccountState[] = [
    acct({ accountId: "a1", currentArr: 100_000, healthScore: 0.9, renewalConfidence: 0.9 }),
    acct({ accountId: "a2", currentArr: 80_000, healthScore: 0.3, renewalConfidence: 0.25, usageTrend: 0.2 }),
    acct({ accountId: "a3", currentArr: 60_000, healthScore: 0.5, renewalConfidence: 0.5, usageTrend: 0.4 }),
    acct({
      accountId: "a4",
      currentArr: 0,
      churnedAtIso: "2026-02-10T00:00:00.000Z",
      cohortStartIso: "2025-02-01T00:00:00.000Z",
    }),
  ];

  it("forecasts only active accounts", () => {
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts,
    });
    expect(rep.forecasts.map((f) => f.accountId).sort()).toEqual(["a1", "a2", "a3"]);
  });

  it("portfolio ARR at risk = sum of expected ARR loss", () => {
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts,
    });
    const expected = rep.forecasts.reduce((s, f) => s + f.expectedArrLoss, 0);
    expect(rep.portfolioArrAtRisk).toBe(expected);
  });

  it("projected GRR = retained / total", () => {
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts,
    });
    const total = 100_000 + 80_000 + 60_000;
    const retained = total - rep.portfolioArrAtRisk;
    expect(rep.projectedGrr).toBeCloseTo(retained / total, 3);
  });

  it("topAtRisk is sorted by expectedArrLoss desc and capped", () => {
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts,
    });
    for (let i = 1; i < rep.topAtRisk.length; i++) {
      expect(rep.topAtRisk[i].expectedArrLoss).toBeLessThanOrEqual(
        rep.topAtRisk[i - 1].expectedArrLoss,
      );
    }
    expect(rep.topAtRisk.length).toBeLessThanOrEqual(10);
  });

  it("headline mentions ARR and GRR", () => {
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts,
    });
    expect(rep.headline).toMatch(/ARR/);
    expect(rep.headline).toMatch(/GRR/);
  });

  it("callouts flag high-risk accounts", () => {
    const risky: AccountState[] = Array.from({ length: 3 }, (_, i) => acct({
      accountId: `r${i}`,
      currentArr: 50_000,
      healthScore: 0.1,
      renewalConfidence: 0.1,
      usageTrend: 0.1,
      recentEscalations: 5,
      nps: -40,
      renewalDueIso: "2026-05-15T00:00:00.000Z",
    }));
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts: risky,
    });
    expect(rep.callouts.some((c) => /50%/.test(c))).toBe(true);
  });

  it("callouts flag weak GRR below 90%", () => {
    const weak: AccountState[] = [
      acct({
        accountId: "w1",
        currentArr: 100_000,
        healthScore: 0.1,
        renewalConfidence: 0.1,
        usageTrend: 0.1,
      }),
    ];
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts: weak,
    });
    expect(rep.callouts.some((c) => /GRR/.test(c))).toBe(true);
  });

  it("produces non-empty cohort curves", () => {
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts,
    });
    expect(rep.cohorts.length).toBeGreaterThan(0);
    expect(rep.cohorts[0].points.length).toBeGreaterThan(0);
  });
});
