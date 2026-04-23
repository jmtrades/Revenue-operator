/**
 * Phase 50 — Renewal & expansion orchestrator.
 */
import { describe, it, expect } from "vitest";
import {
  orchestrateRenewals,
  type RenewalAccount,
} from "../src/lib/sales/renewal-orchestrator";
import type { HealthScore } from "../src/lib/sales/customer-health";

const NOW = "2026-04-22T12:00:00.000Z";

function health(over: Partial<HealthScore> = {}): HealthScore {
  return {
    accountId: "acc-1",
    score: 70,
    status: "monitoring",
    pillars: {
      usage: { score: 70, drivers: [], risks: [] },
      engagement: { score: 70, drivers: [], risks: [] },
      support: { score: 70, drivers: [], risks: [] },
      commercial: { score: 70, drivers: [], risks: [] },
      relationship: { score: 70, drivers: [], risks: [] },
    },
    churnRisk: 0.2,
    expansionSignal: 0.2,
    renewalConfidence: 0.8,
    playbook: "renew_steady",
    topDrivers: [],
    topRisks: [],
    ...over,
  };
}

function account(over: Partial<RenewalAccount> = {}): RenewalAccount {
  return {
    accountId: "acc-1",
    accountName: "Acme",
    currentArr: 120_000,
    currency: "USD",
    renewalDateIso: "2026-07-22T00:00:00.000Z", // 90d out
    health: health(),
    ...over,
  };
}

describe("orchestrateRenewals — motion selection", () => {
  it("assigns save_play when churnRisk exceeds floor", () => {
    const r = orchestrateRenewals(
      [account({ health: health({ churnRisk: 0.7, playbook: "save_play" }) })],
      NOW,
    );
    expect(r.accounts[0].motion).toBe("save_play");
  });

  it("assigns executive_renewal for strategic account with risk", () => {
    const r = orchestrateRenewals(
      [
        account({
          currentArr: 1_000_000,
          health: health({ churnRisk: 0.6, score: 50, playbook: "save_play" }),
        }),
      ],
      NOW,
      { strategicArrFloor: 250_000, saveChurnRiskFloor: 0.5 },
    );
    expect(r.accounts[0].motion).toBe("executive_renewal");
    expect(r.accounts[0].recommendedOwners.primary).toBe("exec_sponsor");
  });

  it("assigns expansion_play when expansionSignal >= 0.4 and health plays expansion", () => {
    const r = orchestrateRenewals(
      [
        account({
          health: health({ expansionSignal: 0.6, playbook: "expansion_play", churnRisk: 0.1 }),
        }),
      ],
      NOW,
    );
    expect(r.accounts[0].motion).toBe("expansion_play");
    expect(r.accounts[0].expansionArrPotential).toBeGreaterThan(0);
  });

  it("assigns advocate when playbook=advocate and low risk", () => {
    const r = orchestrateRenewals(
      [account({ health: health({ playbook: "advocate", score: 90, expansionSignal: 0.6 }) })],
      NOW,
    );
    expect(r.accounts[0].motion).toBe("advocate");
  });

  it("assigns exit_intervention when playbook=exit_intervention", () => {
    const r = orchestrateRenewals(
      [
        account({
          currentArr: 50_000, // below strategic floor so it stays exit_intervention
          health: health({ playbook: "exit_intervention", churnRisk: 0.8, score: 30 }),
        }),
      ],
      NOW,
      { strategicArrFloor: 250_000 },
    );
    expect(r.accounts[0].motion).toBe("exit_intervention");
  });

  it("defaults to renew_steady for healthy accounts", () => {
    const r = orchestrateRenewals([account()], NOW);
    expect(r.accounts[0].motion).toBe("renew_steady");
  });
});

describe("orchestrateRenewals — plays", () => {
  it("each play has ordered steps starting at 1", () => {
    const r = orchestrateRenewals([account()], NOW);
    const steps = r.accounts[0].play;
    expect(steps[0].order).toBe(1);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].order).toBe(steps[i - 1].order + 1);
    }
  });

  it("save_play includes exec sponsor touch", () => {
    const r = orchestrateRenewals(
      [
        account({
          currentArr: 100_000,
          health: health({ churnRisk: 0.7, playbook: "save_play" }),
        }),
      ],
      NOW,
    );
    const play = r.accounts[0].play;
    expect(play.some((p) => /exec sponsor|escalation/i.test(p.action))).toBe(true);
  });

  it("exit_intervention includes 48h exec call", () => {
    const r = orchestrateRenewals(
      [account({ health: health({ playbook: "exit_intervention", churnRisk: 0.8 }) })],
      NOW,
    );
    const step = r.accounts[0].play.find((p) => p.owner === "exec_sponsor");
    expect(step).toBeDefined();
    expect(step!.dueInDays).toBeLessThanOrEqual(5);
  });
});

describe("orchestrateRenewals — urgency", () => {
  it("urgencyLabel reflects days to renewal", () => {
    const near = orchestrateRenewals(
      [account({ renewalDateIso: "2026-04-26T00:00:00.000Z" })],
      NOW,
    );
    expect(near.accounts[0].urgencyLabel).toBe("this_week");

    const mid = orchestrateRenewals(
      [account({ renewalDateIso: "2026-05-15T00:00:00.000Z" })],
      NOW,
    );
    expect(mid.accounts[0].urgencyLabel).toBe("this_month");

    const quarter = orchestrateRenewals(
      [account({ renewalDateIso: "2026-07-20T00:00:00.000Z" })],
      NOW,
    );
    expect(quarter.accounts[0].urgencyLabel).toBe("this_quarter");

    const later = orchestrateRenewals(
      [account({ renewalDateIso: "2026-12-01T00:00:00.000Z" })],
      NOW,
    );
    expect(later.accounts[0].urgencyLabel).toBe("later");
  });
});

describe("orchestrateRenewals — portfolio math", () => {
  it("totalArr equals sum of currentArr", () => {
    const accs = [
      account({ accountId: "a", currentArr: 100_000 }),
      account({ accountId: "b", currentArr: 250_000 }),
    ];
    const r = orchestrateRenewals(accs, NOW);
    expect(r.portfolio.totalArr).toBe(350_000);
  });

  it("projectedNrr is bounded by presence of expansion", () => {
    const accs = [
      account({
        accountId: "a",
        currentArr: 100_000,
        health: health({ playbook: "expansion_play", expansionSignal: 0.8, churnRisk: 0.1 }),
      }),
    ];
    const r = orchestrateRenewals(accs, NOW);
    expect(r.portfolio.projectedNrr).toBeGreaterThan(0);
  });

  it("motionCounts reflects distribution of accounts", () => {
    const accs = [
      account({ accountId: "a", health: health({ playbook: "save_play", churnRisk: 0.7 }) }),
      account({ accountId: "b", health: health({ playbook: "advocate", expansionSignal: 0.6 }) }),
      account({ accountId: "c" }),
    ];
    const r = orchestrateRenewals(accs, NOW);
    expect(r.portfolio.motionCounts.save_play).toBe(1);
    expect(r.portfolio.motionCounts.advocate).toBe(1);
    expect(r.portfolio.motionCounts.renew_steady).toBe(1);
  });

  it("topAtRisk sorted desc by atRiskArr", () => {
    const accs = [
      account({
        accountId: "a",
        currentArr: 100_000,
        health: health({ playbook: "save_play", churnRisk: 0.3 }),
      }),
      account({
        accountId: "b",
        currentArr: 500_000,
        health: health({ playbook: "save_play", churnRisk: 0.6 }),
      }),
    ];
    const r = orchestrateRenewals(accs, NOW);
    expect(r.portfolio.topAtRisk[0].accountId).toBe("b");
  });

  it("empty portfolio returns zeros not NaN", () => {
    const r = orchestrateRenewals([], NOW);
    expect(r.portfolio.totalArr).toBe(0);
    expect(r.portfolio.projectedNrr).toBe(0);
    expect(r.portfolio.projectedGrr).toBe(0);
    expect(r.accounts).toEqual([]);
  });
});

describe("orchestrateRenewals — priority ordering", () => {
  it("sorts by priorityScore desc", () => {
    const accs = [
      account({ accountId: "low", currentArr: 50_000 }),
      account({
        accountId: "high",
        currentArr: 2_000_000,
        health: health({ playbook: "save_play", churnRisk: 0.7, score: 45 }),
        renewalDateIso: "2026-05-01T00:00:00.000Z",
      }),
    ];
    const r = orchestrateRenewals(accs, NOW);
    expect(r.accounts[0].accountId).toBe("high");
  });
});
