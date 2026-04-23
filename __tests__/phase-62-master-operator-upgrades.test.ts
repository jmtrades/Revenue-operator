/**
 * Phase 62 — Action-planner upgrades (dedup, capacity, monetized impact, stable IDs).
 */
import { describe, it, expect } from "vitest";
import { planActions, type RawAction } from "../src/lib/revenue-core/action-planner";

const AS_OF = "2026-04-22T00:00:00Z";

function raw(over: Partial<RawAction> = {}): RawAction {
  return {
    category: "close_win",
    role: "rep",
    ownerId: "rep1",
    accountId: "acc1",
    dealId: "d1",
    title: "Run close call",
    why: "deal stalled",
    severity: "warning",
    expectedImpactMajor: 50_000,
    expectedImpactCurrency: "USD",
    estimatedMinutes: 30,
    ...over,
  };
}

describe("planActions — dedup", () => {
  it("collapses duplicates on (category, accountId, dealId)", () => {
    const plan = planActions(
      [
        raw({ title: "Version A", severity: "warning" }),
        raw({ title: "Version B", severity: "critical", expectedImpactMajor: 80_000 }),
        raw({ title: "Version C", severity: "info" }),
      ],
      { orgId: "org1", asOfIso: AS_OF },
    );
    expect(plan.actions.length).toBe(1);
    expect(plan.actions[0].title).toBe("Version B"); // highest severity wins
    expect(plan.actions[0].mergedFrom.length).toBe(2);
    expect(plan.deduplicatedCount).toBe(2);
  });

  it("different categories on same deal are NOT dedup'd", () => {
    const plan = planActions(
      [raw({ category: "close_win" }), raw({ category: "renewal_motion" })],
      { orgId: "org1", asOfIso: AS_OF },
    );
    expect(plan.actions.length).toBe(2);
  });

  it("same category different dealId not dedup'd", () => {
    const plan = planActions(
      [raw({ dealId: "d1" }), raw({ dealId: "d2" })],
      { orgId: "org1", asOfIso: AS_OF },
    );
    expect(plan.actions.length).toBe(2);
  });
});

describe("planActions — stable ids", () => {
  it("same input → same action id across runs", () => {
    const a = planActions([raw()], { orgId: "org1", asOfIso: AS_OF });
    const b = planActions([raw()], { orgId: "org1", asOfIso: AS_OF });
    expect(a.actions[0].actionId).toBe(b.actions[0].actionId);
  });

  it("different orgs → different ids", () => {
    const a = planActions([raw()], { orgId: "org1", asOfIso: AS_OF });
    const b = planActions([raw()], { orgId: "org2", asOfIso: AS_OF });
    expect(a.actions[0].actionId).not.toBe(b.actions[0].actionId);
  });

  it("different days → different ids", () => {
    const a = planActions([raw()], { orgId: "org1", asOfIso: AS_OF });
    const b = planActions([raw()], {
      orgId: "org1",
      asOfIso: "2026-04-23T00:00:00Z",
    });
    expect(a.actions[0].actionId).not.toBe(b.actions[0].actionId);
  });
});

describe("planActions — capacity enforcement", () => {
  it("caps per-owner minutes", () => {
    const actions = Array.from({ length: 20 }, (_, i) =>
      raw({
        accountId: `acc${i}`,
        dealId: `d${i}`,
        estimatedMinutes: 60,
        severity: "warning",
      }),
    );
    const plan = planActions(actions, {
      orgId: "org1",
      asOfIso: AS_OF,
      perOwnerMinutes: 180,
    });
    // 180 / 60 = 3 warning actions for rep1.
    const kept = plan.perOwnerLoad.find((p) => p.ownerId === "rep1");
    expect(kept?.minutes).toBeLessThanOrEqual(180);
    expect(plan.droppedDueToCapacity.length).toBeGreaterThan(0);
  });

  it("critical actions bypass cap up to 2x", () => {
    const actions = Array.from({ length: 10 }, (_, i) =>
      raw({
        accountId: `acc${i}`,
        dealId: `d${i}`,
        severity: "critical",
        estimatedMinutes: 60,
      }),
    );
    const plan = planActions(actions, {
      orgId: "org1",
      asOfIso: AS_OF,
      perOwnerMinutes: 120,
    });
    // Cap is 120, 2x = 240 → 4 items fit, rest dropped.
    const kept = plan.perOwnerLoad.find((p) => p.ownerId === "rep1");
    expect(kept?.minutes).toBeLessThanOrEqual(240);
    expect(kept?.minutes).toBeGreaterThan(120);
  });

  it("maxTotalActions caps across org", () => {
    const actions = Array.from({ length: 50 }, (_, i) =>
      raw({
        accountId: `acc${i}`,
        dealId: `d${i}`,
        ownerId: `rep${i % 10}`,
        estimatedMinutes: 1,
        severity: "info",
      }),
    );
    const plan = planActions(actions, {
      orgId: "org1",
      asOfIso: AS_OF,
      maxTotalActions: 15,
    });
    expect(plan.actions.length).toBeLessThanOrEqual(15);
    expect(plan.droppedDueToCapacity.length).toBeGreaterThanOrEqual(35);
  });

  it("higher priority kept when dropping", () => {
    const hi = raw({ accountId: "hi", dealId: "d1", severity: "critical", expectedImpactMajor: 1_000_000, estimatedMinutes: 100 });
    const lo = raw({ accountId: "lo", dealId: "d2", severity: "info", expectedImpactMajor: 10, estimatedMinutes: 100 });
    const plan = planActions([hi, lo], { orgId: "org1", asOfIso: AS_OF, perOwnerMinutes: 100 });
    expect(plan.actions[0].accountId).toBe("hi");
    expect(plan.droppedDueToCapacity[0]?.accountId).toBe("lo");
  });
});

describe("planActions — monetized impact", () => {
  it("sums USD impact across actions", () => {
    const plan = planActions(
      [
        raw({ dealId: "d1", expectedImpactMajor: 100_000 }),
        raw({ dealId: "d2", expectedImpactMajor: 50_000 }),
      ],
      { orgId: "org1", asOfIso: AS_OF, perOwnerMinutes: 1000 },
    );
    expect(plan.totalExpectedImpact.currency).toBe("USD");
    expect(plan.totalExpectedImpact.minor).toBe(15_000_000); // $150k in cents
  });

  it("converts foreign currency using fxRates", () => {
    const plan = planActions(
      [
        raw({
          dealId: "d1",
          expectedImpactMajor: 100_000,
          expectedImpactCurrency: "EUR",
        }),
      ],
      {
        orgId: "org1",
        asOfIso: AS_OF,
        reportingCurrency: "USD",
        fxRates: { EUR: 1.1 },
      },
    );
    // €100k → $110k → 11_000_000 cents
    expect(plan.totalExpectedImpact.minor).toBe(11_000_000);
  });

  it("throws when fxRates missing for a used currency", () => {
    expect(() =>
      planActions(
        [
          raw({
            expectedImpactCurrency: "EUR",
          }),
        ],
        { orgId: "org1", asOfIso: AS_OF, reportingCurrency: "USD" },
      ),
    ).toThrow(/FX rate/);
  });
});

describe("planActions — per-owner load breakdown", () => {
  it("groups by owner", () => {
    const plan = planActions(
      [
        raw({ ownerId: "rep1", dealId: "d1", estimatedMinutes: 30 }),
        raw({ ownerId: "rep2", dealId: "d2", estimatedMinutes: 45 }),
      ],
      { orgId: "org1", asOfIso: AS_OF, perOwnerMinutes: 1000 },
    );
    expect(plan.perOwnerLoad.length).toBe(2);
    const rep1 = plan.perOwnerLoad.find((p) => p.ownerId === "rep1");
    expect(rep1?.minutes).toBe(30);
  });

  it("sorts per-owner load by minutes desc", () => {
    const plan = planActions(
      [
        raw({ ownerId: "rep1", dealId: "d1", estimatedMinutes: 10 }),
        raw({ ownerId: "rep2", dealId: "d2", estimatedMinutes: 120 }),
        raw({ ownerId: "rep3", dealId: "d3", estimatedMinutes: 60 }),
      ],
      { orgId: "org1", asOfIso: AS_OF, perOwnerMinutes: 1000 },
    );
    expect(plan.perOwnerLoad[0].ownerId).toBe("rep2");
    expect(plan.perOwnerLoad[plan.perOwnerLoad.length - 1].ownerId).toBe("rep1");
  });
});

describe("planActions — ordering", () => {
  it("critical before warning before info", () => {
    const plan = planActions(
      [
        raw({ dealId: "d1", severity: "info", expectedImpactMajor: 999_999 }),
        raw({ dealId: "d2", severity: "critical", expectedImpactMajor: 1 }),
        raw({ dealId: "d3", severity: "warning", expectedImpactMajor: 500 }),
      ],
      { orgId: "org1", asOfIso: AS_OF, perOwnerMinutes: 1000 },
    );
    expect(plan.actions[0].severity).toBe("critical");
    expect(plan.actions[1].severity).toBe("warning");
    expect(plan.actions[2].severity).toBe("info");
  });
});
