/**
 * Phase 23 — Rules-based + round-robin lead router.
 */

import { describe, it, expect } from "vitest";
import {
  routeLead,
  type LeadRoutingInput,
  type RepPoolEntry,
  type RoutingRule,
} from "../src/lib/sales/lead-router";

function leadOf(overrides: Partial<LeadRoutingInput> = {}): LeadRoutingInput {
  return {
    leadId: "lead-1",
    country: "US",
    state: "CA",
    postalCode: "94105",
    industry: "saas",
    employeeCount: 50,
    annualRevenue: 2_000_000,
    source: "webform",
    ...overrides,
  };
}

function repOf(overrides: Partial<RepPoolEntry> = {}): RepPoolEntry {
  return {
    repId: "rep-a",
    isAvailable: true,
    capacity: 100,
    openLeadCount: 10,
    ...overrides,
  };
}

describe("routeLead — no rules → unassigned", () => {
  it("returns null when there are no rules", () => {
    const d = routeLead({
      lead: leadOf(),
      rules: [],
      reps: [repOf()],
      roundRobinState: {},
    });
    expect(d.assignedRepId).toBeNull();
    expect(d.matchedRuleId).toBeNull();
  });
});

describe("routeLead — rule priority", () => {
  it("picks the lowest-priority matching rule first", () => {
    const rules: RoutingRule[] = [
      {
        id: "r-lower",
        priority: 10,
        match: { states: ["CA"] },
        repPool: ["rep-b"],
        selectionMode: "specific_rep",
        specificRepId: "rep-b",
      },
      {
        id: "r-higher",
        priority: 1,
        match: { states: ["CA"] },
        repPool: ["rep-a"],
        selectionMode: "specific_rep",
        specificRepId: "rep-a",
      },
    ];
    const d = routeLead({
      lead: leadOf(),
      rules,
      reps: [repOf({ repId: "rep-a" }), repOf({ repId: "rep-b" })],
      roundRobinState: {},
    });
    expect(d.matchedRuleId).toBe("r-higher");
    expect(d.assignedRepId).toBe("rep-a");
  });

  it("falls through when top rule has no eligible reps", () => {
    const rules: RoutingRule[] = [
      {
        id: "r1",
        priority: 1,
        match: {},
        repPool: ["rep-unavailable"],
        selectionMode: "round_robin",
      },
      {
        id: "r2",
        priority: 2,
        match: {},
        repPool: ["rep-available"],
        selectionMode: "round_robin",
      },
    ];
    const d = routeLead({
      lead: leadOf(),
      rules,
      reps: [
        repOf({ repId: "rep-unavailable", isAvailable: false }),
        repOf({ repId: "rep-available" }),
      ],
      roundRobinState: {},
    });
    expect(d.matchedRuleId).toBe("r2");
    expect(d.assignedRepId).toBe("rep-available");
  });
});

describe("routeLead — match predicates", () => {
  it("filters by country", () => {
    const rules: RoutingRule[] = [
      { id: "r", priority: 1, match: { countries: ["GB"] }, repPool: ["rep-a"], selectionMode: "specific_rep", specificRepId: "rep-a" },
    ];
    const d = routeLead({ lead: leadOf({ country: "US" }), rules, reps: [repOf()], roundRobinState: {} });
    expect(d.assignedRepId).toBeNull();
  });

  it("filters by state (case-insensitive)", () => {
    const rules: RoutingRule[] = [
      { id: "r", priority: 1, match: { states: ["ca"] }, repPool: ["rep-a"], selectionMode: "specific_rep", specificRepId: "rep-a" },
    ];
    const d = routeLead({ lead: leadOf({ state: "CA" }), rules, reps: [repOf()], roundRobinState: {} });
    expect(d.assignedRepId).toBe("rep-a");
  });

  it("filters by postal prefix", () => {
    const rules: RoutingRule[] = [
      { id: "r", priority: 1, match: { postalPrefixes: ["941"] }, repPool: ["rep-a"], selectionMode: "specific_rep", specificRepId: "rep-a" },
    ];
    const matched = routeLead({ lead: leadOf({ postalCode: "94105" }), rules, reps: [repOf()], roundRobinState: {} });
    expect(matched.assignedRepId).toBe("rep-a");
    const unmatched = routeLead({ lead: leadOf({ postalCode: "99999" }), rules, reps: [repOf()], roundRobinState: {} });
    expect(unmatched.assignedRepId).toBeNull();
  });

  it("filters by company size", () => {
    const rules: RoutingRule[] = [
      {
        id: "r",
        priority: 1,
        match: { minEmployeeCount: 100 },
        repPool: ["rep-a"],
        selectionMode: "specific_rep",
        specificRepId: "rep-a",
      },
    ];
    const small = routeLead({ lead: leadOf({ employeeCount: 20 }), rules, reps: [repOf()], roundRobinState: {} });
    expect(small.assignedRepId).toBeNull();
    const big = routeLead({ lead: leadOf({ employeeCount: 500 }), rules, reps: [repOf()], roundRobinState: {} });
    expect(big.assignedRepId).toBe("rep-a");
  });

  it("filters by industry", () => {
    const rules: RoutingRule[] = [
      { id: "r", priority: 1, match: { industries: ["saas", "fintech"] }, repPool: ["rep-a"], selectionMode: "specific_rep", specificRepId: "rep-a" },
    ];
    const ok = routeLead({ lead: leadOf({ industry: "saas" }), rules, reps: [repOf()], roundRobinState: {} });
    expect(ok.assignedRepId).toBe("rep-a");
    const no = routeLead({ lead: leadOf({ industry: "legal" }), rules, reps: [repOf()], roundRobinState: {} });
    expect(no.assignedRepId).toBeNull();
  });

  it("filters by custom equals", () => {
    const rules: RoutingRule[] = [
      {
        id: "r",
        priority: 1,
        match: { customEquals: { tier: "enterprise" } },
        repPool: ["rep-a"],
        selectionMode: "specific_rep",
        specificRepId: "rep-a",
      },
    ];
    const ok = routeLead({
      lead: leadOf({ customFields: { tier: "enterprise" } }),
      rules,
      reps: [repOf()],
      roundRobinState: {},
    });
    expect(ok.assignedRepId).toBe("rep-a");
    const no = routeLead({
      lead: leadOf({ customFields: { tier: "smb" } }),
      rules,
      reps: [repOf()],
      roundRobinState: {},
    });
    expect(no.assignedRepId).toBeNull();
  });
});

describe("routeLead — selection modes", () => {
  it("round_robin distributes across eligible reps", () => {
    const rules: RoutingRule[] = [
      { id: "rr", priority: 1, match: {}, repPool: ["a", "b", "c"], selectionMode: "round_robin" },
    ];
    const reps = [
      repOf({ repId: "a" }),
      repOf({ repId: "b" }),
      repOf({ repId: "c" }),
    ];
    const state: Record<string, number> = {};
    const picks: string[] = [];
    let rrState = state;
    for (let i = 0; i < 6; i++) {
      const d = routeLead({ lead: leadOf(), rules, reps, roundRobinState: rrState });
      picks.push(d.assignedRepId!);
      rrState = d.updatedRoundRobinState;
    }
    expect(picks).toEqual(["a", "b", "c", "a", "b", "c"]);
  });

  it("least_loaded picks rep with fewest open leads", () => {
    const rules: RoutingRule[] = [
      { id: "ll", priority: 1, match: {}, repPool: ["a", "b", "c"], selectionMode: "least_loaded" },
    ];
    const reps = [
      repOf({ repId: "a", openLeadCount: 50 }),
      repOf({ repId: "b", openLeadCount: 5 }),
      repOf({ repId: "c", openLeadCount: 25 }),
    ];
    const d = routeLead({ lead: leadOf(), rules, reps, roundRobinState: {} });
    expect(d.assignedRepId).toBe("b");
  });

  it("weighted deterministically splits via pickSeed", () => {
    const rules: RoutingRule[] = [
      { id: "w", priority: 1, match: {}, repPool: ["a", "b"], selectionMode: "weighted" },
    ];
    const reps = [
      repOf({ repId: "a", weight: 3 }),
      repOf({ repId: "b", weight: 1 }),
    ];
    // seed 0.1 → into A bucket (0..0.75 of totalWeight 4). seed 0.9 → B.
    const low = routeLead({ lead: leadOf(), rules, reps, roundRobinState: {}, pickSeed: 0.1 });
    expect(low.assignedRepId).toBe("a");
    const hi = routeLead({ lead: leadOf(), rules, reps, roundRobinState: {}, pickSeed: 0.95 });
    expect(hi.assignedRepId).toBe("b");
  });

  it("specific_rep honors the named rep only", () => {
    const rules: RoutingRule[] = [
      { id: "s", priority: 1, match: {}, repPool: ["a", "b"], selectionMode: "specific_rep", specificRepId: "b" },
    ];
    const reps = [repOf({ repId: "a" }), repOf({ repId: "b" })];
    const d = routeLead({ lead: leadOf(), rules, reps, roundRobinState: {} });
    expect(d.assignedRepId).toBe("b");
  });
});

describe("routeLead — rep eligibility", () => {
  it("skips unavailable reps", () => {
    const rules: RoutingRule[] = [
      { id: "r", priority: 1, match: {}, repPool: ["a", "b"], selectionMode: "round_robin" },
    ];
    const reps = [
      repOf({ repId: "a", isAvailable: false }),
      repOf({ repId: "b", isAvailable: true }),
    ];
    const d = routeLead({ lead: leadOf(), rules, reps, roundRobinState: {} });
    expect(d.assignedRepId).toBe("b");
  });

  it("skips reps at capacity", () => {
    const rules: RoutingRule[] = [
      { id: "r", priority: 1, match: {}, repPool: ["a", "b"], selectionMode: "round_robin" },
    ];
    const reps = [
      repOf({ repId: "a", capacity: 10, openLeadCount: 10 }),
      repOf({ repId: "b", capacity: 100, openLeadCount: 50 }),
    ];
    const d = routeLead({ lead: leadOf(), rules, reps, roundRobinState: {} });
    expect(d.assignedRepId).toBe("b");
  });

  it("filters reps by their own territory", () => {
    const rules: RoutingRule[] = [
      { id: "r", priority: 1, match: {}, repPool: ["a", "b"], selectionMode: "round_robin" },
    ];
    const reps = [
      repOf({ repId: "a", states: ["NY"] }), // lead is CA — ineligible
      repOf({ repId: "b", states: ["CA"] }),
    ];
    const d = routeLead({ lead: leadOf(), rules, reps, roundRobinState: {} });
    expect(d.assignedRepId).toBe("b");
  });
});

describe("routeLead — trace", () => {
  it("includes a trace explaining each rule's outcome", () => {
    const rules: RoutingRule[] = [
      { id: "skip", priority: 1, match: { countries: ["GB"] }, repPool: ["a"], selectionMode: "round_robin" },
      { id: "match", priority: 2, match: {}, repPool: ["a"], selectionMode: "round_robin" },
    ];
    const d = routeLead({ lead: leadOf(), rules, reps: [repOf()], roundRobinState: {} });
    expect(d.trace.some((t) => t.includes("rule[skip]"))).toBe(true);
    expect(d.trace.some((t) => t.includes("rule[match]"))).toBe(true);
  });
});
