/**
 * Phase 56 — Master revenue operator composer.
 */
import { describe, it, expect } from "vitest";
import {
  composeMasterRevenueOperator,
  pickTopCriticalActions,
  type MasterRevenueOperatorRequest,
} from "../src/lib/sales/master-revenue-operator";
import type { OrchestratorReport } from "../src/lib/sales/renewal-orchestrator";
import type { RetentionReport } from "../src/lib/sales/cohort-retention";
import type { DataQualityReport } from "../src/lib/sales/revenue-data-quality";
import type { DealDeskDecision } from "../src/lib/sales/pricing-deal-desk";
import type { CoachingPlan } from "../src/lib/sales/rep-coaching-synthesizer";
import type { WinSimulationResult } from "../src/lib/sales/deal-win-simulator";
import type { BoardMetricsPackage, KpiValue } from "../src/lib/sales/board-kpi-composer";

function kpi(value: number, code = "k", label = "label", unit: KpiValue["unit"] = "ratio"): KpiValue {
  return { code, label, value, unit };
}

function boardFixture(): BoardMetricsPackage {
  return {
    period: { label: "Q2-2026", startIso: AS_OF, endIso: AS_OF },
    company: { name: "Acme", currency: "USD" },
    revenue: {
      arrStart: kpi(10_000_000, "arr_start", "Starting ARR", "currency"),
      arrEnd: kpi(12_000_000, "arr_end", "Ending ARR", "currency"),
      netNewArr: kpi(2_000_000, "net_new_arr", "Net-new ARR", "currency"),
      nrr: kpi(0.95, "nrr", "NRR"),
      grr: kpi(0.88, "grr", "GRR"),
      logoChurnRate: kpi(0.05, "logo_churn", "Logo churn"),
    },
    efficiency: {
      cac: kpi(10_000, "cac", "CAC", "currency"),
      ltv: kpi(50_000, "ltv", "LTV", "currency"),
      ltvToCac: kpi(5, "ltv_cac", "LTV:CAC", "multiple"),
      paybackMonths: kpi(18, "payback", "Payback months", "months"),
      magicNumber: kpi(1.2, "magic", "Magic number", "multiple"),
      burnMultiple: kpi(0.8, "burn", "Burn multiple", "multiple"),
      ruleOf40: kpi(0.45, "r40", "Rule of 40"),
    },
    margins: {
      grossMargin: kpi(0.75, "gm", "Gross margin", "pct"),
      operatingMargin: kpi(0.2, "om", "Operating margin", "pct"),
    },
    pipeline: {
      coverageRatio: kpi(3.2, "coverage", "Coverage", "multiple"),
      pipelineValue: kpi(20_000_000, "pipe", "Pipeline value", "currency"),
      winRate: kpi(0.28, "win", "Win rate", "pct"),
      avgDealSize: kpi(75_000, "avg", "Avg deal size", "currency"),
      salesVelocity: kpi(350_000, "vel", "Sales velocity", "currency"),
    },
    headline: "ARR $12M · NRR 95%",
    callouts: ["NRR 95% below healthy 100%."],
  };
}

const AS_OF = "2026-04-22T00:00:00.000Z";

function renewalFixture(): OrchestratorReport {
  return {
    asOfIso: AS_OF,
    horizonDays: 90,
    accounts: [
      {
        accountId: "acc-hot",
        accountName: "Hot Save",
        motion: "save_play",
        priorityScore: 95,
        urgencyLabel: "this_week",
        daysToRenewal: 21,
        expectedRenewalArr: 50_000,
        atRiskArr: 150_000,
        expansionArrPotential: 0,
        play: [
          { order: 1, owner: "csm", action: "Book exec save call", dueInDays: 3 },
          { order: 2, owner: "exec_sponsor", action: "Draft remediation plan", dueInDays: 5 },
        ],
        recommendedOwners: { primary: "csm", escalateTo: "exec_sponsor" },
        rationale: "Churn risk > 60%, low health.",
      },
      {
        accountId: "acc-grow",
        accountName: "Grow Co",
        motion: "expansion_play",
        priorityScore: 60,
        urgencyLabel: "this_month",
        daysToRenewal: 45,
        expectedRenewalArr: 100_000,
        atRiskArr: 0,
        expansionArrPotential: 35_000,
        play: [{ order: 1, owner: "ae", action: "Pitch seat expansion", dueInDays: 10 }],
        recommendedOwners: { primary: "ae" },
        rationale: "Usage trend positive.",
      },
    ],
    portfolio: {
      totalArr: 300_000,
      atRiskArr: 150_000,
      expansionPotentialArr: 35_000,
      committedRenewalArr: 150_000,
      projectedEndArr: 185_000,
      projectedNrr: 0.62,
      projectedGrr: 0.5,
      motionCounts: {
        advocate: 0,
        renew_steady: 0,
        expansion_play: 1,
        save_play: 1,
        exit_intervention: 0,
        executive_renewal: 0,
      },
      topAtRisk: [],
      topExpansion: [],
    },
  };
}

function retentionFixture(): RetentionReport {
  return {
    asOfIso: AS_OF,
    horizonDays: 90,
    cohorts: [],
    forecasts: [
      {
        accountId: "acc-churn",
        churnProbability: 0.75,
        expectedArrLoss: 120_000,
        topRiskFactors: ["Declining usage", "Detractor NPS"],
      },
      {
        accountId: "acc-ok",
        churnProbability: 0.1,
        expectedArrLoss: 5_000,
        topRiskFactors: [],
      },
    ],
    portfolioArrAtRisk: 125_000,
    portfolioRetainedArr: 375_000,
    projectedGrr: 0.75,
    topAtRisk: [],
    headline: "500k ARR · projected GRR 75%",
    callouts: ["Projected GRR 75.0% is below healthy SaaS benchmark (90%)."],
  };
}

function dqFixture(): DataQualityReport {
  return {
    asOfIso: AS_OF,
    overallScore: 68,
    grade: "D",
    issues: [
      {
        id: "dq-critical",
        category: "overdue_close_date",
        severity: "critical",
        entityType: "deal",
        entityId: "d1",
        ownerId: "rep1",
        headline: "Deal d1 close date is in the past but still open.",
        remediation: "Update close date or close-lose.",
        detectedAtIso: AS_OF,
      },
      {
        id: "dq-warn",
        category: "missing_next_step",
        severity: "warning",
        entityType: "deal",
        entityId: "d2",
        ownerId: "rep1",
        headline: "Deal d2 has no next step.",
        remediation: "Log next step with date.",
        detectedAtIso: AS_OF,
      },
    ],
    categoryScores: [],
    ownerFixLists: [],
    headline: "DQ 68/100",
    callouts: ["2 critical issues."],
  };
}

function deskFixture(): DealDeskDecision[] {
  return [
    {
      dealId: "d-block",
      segment: "enterprise",
      requestedDiscountPct: 0.45,
      priceFloorAnnual: 100_000,
      belowFloor: true,
      suggestedAnnualValue: 130_000,
      suggestedDiscountPct: 0.15,
      expectedWinLift: { holdList: 0.4, atRequested: 0.6, atSuggested: 0.5 },
      approvals: [{ role: "cfo", required: true, reason: "Below floor" }],
      redlines: [],
      commentary: [],
      outcome: "blocked",
    },
    {
      dealId: "d-approve",
      segment: "mid_market",
      requestedDiscountPct: 0.05,
      priceFloorAnnual: 10_000,
      belowFloor: false,
      suggestedAnnualValue: 100_000,
      suggestedDiscountPct: 0.05,
      expectedWinLift: { holdList: 0.4, atRequested: 0.5, atSuggested: 0.5 },
      approvals: [{ role: "ae", required: true, reason: "AE signs" }],
      redlines: [],
      commentary: [],
      outcome: "auto_approve",
    },
  ];
}

function coachingFixture(): CoachingPlan[] {
  return [
    {
      repId: "rep1",
      repName: "Jamie Rep",
      windowStart: AS_OF,
      windowEnd: AS_OF,
      focusAreas: [
        {
          category: "talk_balance",
          weight: 4,
          rationale: "Rep dominates talk share.",
          priority: "high",
          severity: 0.8,
        } as any,
      ],
      drills: [
        {
          category: "talk_balance",
          title: "Active listening drill",
          cadence: "weekly",
          description: "Pair up for 20-min mock calls focused on asking questions.",
          successCriteria: "Rep talk share < 60%",
        },
      ],
      goals: [],
      strengths: [],
      managerBrief: "Focus on talk balance.",
      nextCheckinIso: "2026-05-06T00:00:00.000Z",
    },
  ];
}

function simulatorFixture(): { topDeals: WinSimulationResult[] } {
  return {
    topDeals: [
      {
        dealId: "s1",
        baseProbability: 0.4,
        finalProbability: 0.62,
        totalLift: 0.22,
        ranked: [],
        recommendedPath: [
          {
            stepIndex: 0,
            intervention: {
              code: "identify_champion",
              label: "Identify champion",
              effortHours: 4,
              apply: (d) => d,
              isApplicable: () => true,
              rationale: "No champion identified.",
            },
            probabilityBefore: 0.4,
            probabilityAfter: 0.55,
            marginalLift: 0.15,
            cumulativeLift: 0.15,
            effortHoursCumulative: 4,
          },
        ],
        totalEffortHours: 4,
        headline: "Identify champion to lift win probability.",
      },
    ],
  };
}

function minimalRequest(over: Partial<MasterRevenueOperatorRequest> = {}): MasterRevenueOperatorRequest {
  return {
    asOfIso: AS_OF,
    company: { name: "Acme", currency: "USD", fiscalQuarter: "Q2-2026" },
    ...over,
  };
}

describe("composeMasterRevenueOperator — coverage", () => {
  it("works with no sub-reports", () => {
    const rep = composeMasterRevenueOperator(minimalRequest());
    expect(rep.actions).toEqual([]);
    expect(rep.coverageNote).toMatch(/Missing/);
  });

  it("reports all sub-systems present", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({
        renewal: renewalFixture(),
        retention: retentionFixture(),
        coaching: coachingFixture(),
        dataQuality: dqFixture(),
        dealDesk: deskFixture(),
        simulator: simulatorFixture(),
        board: boardFixture(),
      }),
    );
    expect(rep.coverageNote).not.toMatch(/Missing/);
  });
});

describe("composeMasterRevenueOperator — actions", () => {
  it("emits a renewal action per account", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ renewal: renewalFixture() }),
    );
    const renewalActions = rep.actions.filter((a) => a.category === "renewal_motion");
    expect(renewalActions.length).toBe(2);
  });

  it("emits churn-save actions above threshold only", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ retention: retentionFixture(), churnActionThreshold: 0.5 }),
    );
    const saves = rep.actions.filter((a) => a.category === "churn_save");
    expect(saves.length).toBe(1);
    expect(saves[0].subjectEntityId).toBe("acc-churn");
  });

  it("skips auto-approved deal-desk decisions", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ dealDesk: deskFixture() }),
    );
    const pricing = rep.actions.filter((a) => a.category === "pricing_guardrail");
    expect(pricing.length).toBe(1);
    expect(pricing[0].subjectEntityId).toBe("d-block");
    expect(pricing[0].role).toBe("cfo");
  });

  it("routes blocked pricing actions to CFO", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ dealDesk: deskFixture() }),
    );
    const block = rep.actions.find((a) => a.subjectEntityId === "d-block");
    expect(block?.role).toBe("cfo");
    expect(block?.severity).toBe("critical");
  });

  it("emits a coaching action per plan", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ coaching: coachingFixture() }),
    );
    const coaching = rep.actions.filter((a) => a.category === "coaching");
    expect(coaching.length).toBe(1);
    expect(coaching[0].role).toBe("manager");
  });

  it("emits close-win actions when simulator has lift", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ simulator: simulatorFixture() }),
    );
    const closeWins = rep.actions.filter((a) => a.category === "close_win");
    expect(closeWins.length).toBe(1);
  });

  it("emits data-quality actions for warning + critical only", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ dataQuality: dqFixture() }),
    );
    const dq = rep.actions.filter((a) => a.category === "data_quality");
    expect(dq.length).toBe(2);
  });
});

describe("composeMasterRevenueOperator — ranking", () => {
  it("critical actions sort before warning, warning before info", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({
        renewal: renewalFixture(),
        retention: retentionFixture(),
        dataQuality: dqFixture(),
        dealDesk: deskFixture(),
      }),
    );
    const rank: Record<string, number> = { critical: 3, warning: 2, info: 1 };
    for (let i = 1; i < rep.actions.length; i++) {
      expect(rank[rep.actions[i].severity]).toBeLessThanOrEqual(
        rank[rep.actions[i - 1].severity],
      );
    }
  });
});

describe("composeMasterRevenueOperator — roles", () => {
  it("groups actions by role with critical counts", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({
        renewal: renewalFixture(),
        retention: retentionFixture(),
        dealDesk: deskFixture(),
      }),
    );
    const cfo = rep.roleAssignments.find((r) => r.role === "cfo");
    expect(cfo).toBeDefined();
    expect(cfo!.criticalCount).toBeGreaterThan(0);
  });
});

describe("composeMasterRevenueOperator — KPIs", () => {
  it("pulls retention ARR-at-risk into kpi spine", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ retention: retentionFixture() }),
    );
    expect(rep.kpis.atRiskArr).toBe(125_000);
    expect(rep.kpis.projectedGrrNextHorizon).toBe(0.75);
  });

  it("pulls data quality score", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ dataQuality: dqFixture() }),
    );
    expect(rep.kpis.dataQualityScore).toBe(68);
  });

  it("pulls deal-desk backlog count", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ dealDesk: deskFixture() }),
    );
    expect(rep.kpis.dealDeskBacklog).toBe(1);
    expect(rep.kpis.pricingFloorViolations).toBe(1);
  });
});

describe("composeMasterRevenueOperator — narrative", () => {
  it("headline mentions company", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ retention: retentionFixture() }),
    );
    expect(rep.headline).toMatch(/Acme/);
    expect(rep.headline).toMatch(/GRR/);
  });

  it("callouts flag weak GRR", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ retention: retentionFixture() }),
    );
    expect(rep.callouts.some((c) => /GRR/.test(c))).toBe(true);
  });

  it("callouts flag pricing floor violations", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ dealDesk: deskFixture() }),
    );
    expect(rep.callouts.some((c) => /floor/i.test(c))).toBe(true);
  });

  it("callouts flag weak data quality", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({ dataQuality: dqFixture(), dqScoreThreshold: 75 }),
    );
    expect(rep.callouts.some((c) => /Data quality/.test(c))).toBe(true);
  });
});

describe("pickTopCriticalActions", () => {
  it("returns only critical severity", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({
        renewal: renewalFixture(),
        dataQuality: dqFixture(),
      }),
    );
    const top = pickTopCriticalActions(rep, 10);
    expect(top.every((a) => a.severity === "critical")).toBe(true);
  });

  it("caps to the requested count", () => {
    const rep = composeMasterRevenueOperator(
      minimalRequest({
        renewal: renewalFixture(),
        dataQuality: dqFixture(),
        dealDesk: deskFixture(),
      }),
    );
    const top = pickTopCriticalActions(rep, 2);
    expect(top.length).toBeLessThanOrEqual(2);
  });
});
