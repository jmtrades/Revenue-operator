/**
 * Phase 44 — Territory design + capacity planning.
 */

import { describe, it, expect } from "vitest";
import {
  computeRepCapacity,
  assignTerritories,
  territoryBalanceReport,
  suggestRebalance,
  type Rep,
  type AccountLoad,
} from "../src/lib/sales/territory-capacity";

function rep(over: Partial<Rep> = {}): Rep {
  return {
    id: "r1",
    name: "Rep One",
    quota: 1_000_000,
    ramp: 1.0,
    tenureMonths: 24,
    avgDealSize: 50_000,
    ...over,
  };
}

function acct(over: Partial<AccountLoad> = {}): AccountLoad {
  return {
    accountId: "a1",
    name: "Account One",
    revenuePotential: 100_000,
    tier: "midmarket",
    ...over,
  };
}

describe("computeRepCapacity", () => {
  it("fully ramped seasoned rep uses 100% of quota", () => {
    const c = computeRepCapacity(rep({ quota: 1_000_000, ramp: 1, tenureMonths: 24, avgDealSize: 50_000 }));
    expect(c.effectiveQuota).toBe(1_000_000);
    expect(c.tenureMultiplier).toBe(1);
    // default coverage = 4x
    expect(c.targetRevenuePotential).toBe(4_000_000);
    expect(c.maxAccounts).toBe(80);
  });

  it("new hire (<3mo) has 0.5x tenure factor", () => {
    const c = computeRepCapacity(rep({ tenureMonths: 1 }));
    expect(c.tenureMultiplier).toBe(0.5);
    expect(c.effectiveQuota).toBe(500_000);
  });

  it("ramp scales effective quota", () => {
    const c = computeRepCapacity(rep({ ramp: 0.5 }));
    expect(c.effectiveQuota).toBe(500_000);
  });

  it("respects hardMaxAccounts ceiling", () => {
    const c = computeRepCapacity(rep({ quota: 10_000_000, avgDealSize: 50_000 }), { hardMaxAccounts: 30 });
    expect(c.maxAccounts).toBe(30);
  });
});

describe("assignTerritories — pinned accounts", () => {
  it("honors named-account pins before balancing", () => {
    const reps = [
      rep({ id: "r1", namedAccountPins: ["a-big"] }),
      rep({ id: "r2" }),
    ];
    const accounts = [
      acct({ accountId: "a-big", revenuePotential: 500_000 }),
      acct({ accountId: "a-small", revenuePotential: 10_000 }),
    ];
    const a = assignTerritories(accounts, reps);
    expect(a.byAccount["a-big"]).toBe("r1");
  });
});

describe("assignTerritories — balance", () => {
  it("distributes equal-sized accounts roughly evenly", () => {
    const reps = [rep({ id: "r1" }), rep({ id: "r2" }), rep({ id: "r3" })];
    const accounts = Array.from({ length: 30 }, (_, i) =>
      acct({ accountId: `a${i}`, revenuePotential: 50_000 }),
    );
    const a = assignTerritories(accounts, reps);
    const counts = Object.values(a.byRep).map((v) => v.length);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    expect(max - min).toBeLessThanOrEqual(1);
  });

  it("unassigns when allowOverflow=false and capacity exceeded", () => {
    const reps = [rep({ id: "r1", quota: 100_000, avgDealSize: 50_000 })];
    // target potential = 400k, max accounts = 2
    const accounts = Array.from({ length: 5 }, (_, i) =>
      acct({ accountId: `a${i}`, revenuePotential: 50_000, geo: "us-west" }),
    );
    const a = assignTerritories(accounts, [{ ...reps[0], geo: ["us-east"] }], { allowOverflow: false });
    expect(a.unassigned.length).toBeGreaterThan(0);
  });
});

describe("assignTerritories — segment fit", () => {
  it("prefers segment-fit rep for matching-tier accounts", () => {
    const reps = [
      rep({ id: "ent", segmentFit: ["enterprise", "strategic"] }),
      rep({ id: "smb", segmentFit: ["smb", "midmarket"] }),
    ];
    const accounts = [
      acct({ accountId: "big", tier: "enterprise", revenuePotential: 500_000 }),
      acct({ accountId: "small", tier: "smb", revenuePotential: 50_000 }),
    ];
    const a = assignTerritories(accounts, reps);
    expect(a.byAccount["big"]).toBe("ent");
    expect(a.byAccount["small"]).toBe("smb");
  });
});

describe("territoryBalanceReport", () => {
  it("flags overloaded and underloaded reps", () => {
    const reps = [
      rep({ id: "r1", quota: 100_000, avgDealSize: 50_000 }), // target potential = 400k
      rep({ id: "r2", quota: 100_000, avgDealSize: 50_000 }),
    ];
    const assignment = {
      byRep: {
        r1: ["big1", "big2", "big3"],
        r2: ["tiny1"],
      },
      byAccount: { big1: "r1", big2: "r1", big3: "r1", tiny1: "r2" },
      unassigned: [],
    };
    const accounts: AccountLoad[] = [
      acct({ accountId: "big1", revenuePotential: 300_000 }),
      acct({ accountId: "big2", revenuePotential: 300_000 }),
      acct({ accountId: "big3", revenuePotential: 300_000 }),
      acct({ accountId: "tiny1", revenuePotential: 20_000 }),
    ];
    const r = territoryBalanceReport(assignment, reps, accounts);
    expect(r.overloadedRepIds).toContain("r1");
    expect(r.underloadedRepIds).toContain("r2");
    expect(r.coefficientOfVariation).toBeGreaterThan(0.5);
  });

  it("balanced territories have low std dev", () => {
    const reps = [rep({ id: "r1" }), rep({ id: "r2" })];
    const accounts = Array.from({ length: 20 }, (_, i) =>
      acct({ accountId: `a${i}`, revenuePotential: 50_000 }),
    );
    const a = assignTerritories(accounts, reps);
    const r = territoryBalanceReport(a, reps, accounts);
    expect(r.coefficientOfVariation).toBeLessThan(0.2);
    expect(r.gini).toBeLessThan(0.2);
  });
});

describe("suggestRebalance", () => {
  it("moves account from heavy rep to light rep to reduce std dev", () => {
    const reps = [rep({ id: "r1" }), rep({ id: "r2" })];
    const accounts: AccountLoad[] = [
      acct({ accountId: "a1", revenuePotential: 300_000 }),
      acct({ accountId: "a2", revenuePotential: 300_000 }),
      acct({ accountId: "a3", revenuePotential: 300_000 }),
      acct({ accountId: "a4", revenuePotential: 20_000 }),
    ];
    const assignment = {
      byRep: {
        r1: ["a1", "a2", "a3"],
        r2: ["a4"],
      },
      byAccount: { a1: "r1", a2: "r1", a3: "r1", a4: "r2" },
      unassigned: [],
    };
    const r = suggestRebalance(assignment, reps, accounts);
    expect(r.moves.length).toBeGreaterThan(0);
    expect(r.projectedStdDev).toBeLessThan(r.startingStdDev);
    expect(r.improvementPct).toBeGreaterThan(0);
  });

  it("makes no moves when already balanced", () => {
    const reps = [rep({ id: "r1" }), rep({ id: "r2" })];
    const accounts: AccountLoad[] = [
      acct({ accountId: "a1", revenuePotential: 100_000 }),
      acct({ accountId: "a2", revenuePotential: 100_000 }),
    ];
    const assignment = {
      byRep: { r1: ["a1"], r2: ["a2"] },
      byAccount: { a1: "r1", a2: "r2" },
      unassigned: [],
    };
    const r = suggestRebalance(assignment, reps, accounts);
    expect(r.moves).toEqual([]);
    expect(r.improvementPct).toBe(0);
  });

  it("does not move pinned accounts", () => {
    const reps = [
      rep({ id: "r1", namedAccountPins: ["a1", "a2", "a3"] }),
      rep({ id: "r2" }),
    ];
    const accounts: AccountLoad[] = [
      acct({ accountId: "a1", revenuePotential: 300_000 }),
      acct({ accountId: "a2", revenuePotential: 300_000 }),
      acct({ accountId: "a3", revenuePotential: 300_000 }),
      acct({ accountId: "a4", revenuePotential: 20_000 }),
    ];
    const assignment = {
      byRep: {
        r1: ["a1", "a2", "a3"],
        r2: ["a4"],
      },
      byAccount: { a1: "r1", a2: "r1", a3: "r1", a4: "r2" },
      unassigned: [],
    };
    const r = suggestRebalance(assignment, reps, accounts);
    // only a4 could move — but a4 is tiny and on the light rep, no improvement possible
    const movedPinned = r.moves.some((m) => ["a1", "a2", "a3"].includes(m.accountId));
    expect(movedPinned).toBe(false);
  });
});
