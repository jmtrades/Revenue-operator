/**
 * Phase 42 — Discount governance + revenue leakage detector.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateDiscount,
  auditDiscountLeakage,
  DEFAULT_POLICY,
  type DealProposal,
  type DiscountPolicy,
} from "../src/lib/sales/discount-governance";

function deal(over: Partial<DealProposal> = {}): DealProposal {
  return {
    id: "d1",
    ownerId: "rep-1",
    listPrice: 100_000,
    quotedPrice: 95_000, // 5% discount
    costOfGoodsPct: 0.25,
    termLengthMonths: 24,
    lineItems: [
      { sku: "platform", listPrice: 100_000, quotedPrice: 95_000, quantity: 1, category: "license" },
    ],
    ...over,
  };
}

describe("evaluateDiscount — approval routing", () => {
  it("5% discount → rep auto-approve", () => {
    const r = evaluateDiscount(deal());
    expect(r.approvalRequired).toBe("rep_auto_approve");
    expect(r.decision).toBe("approved");
  });

  it("15% discount → manager", () => {
    const r = evaluateDiscount(deal({ quotedPrice: 85_000 }));
    expect(r.approvalRequired).toBe("manager");
  });

  it("25% discount → director", () => {
    const r = evaluateDiscount(deal({ quotedPrice: 75_000 }));
    expect(r.approvalRequired).toBe("director");
  });

  it("45% discount → cro", () => {
    const r = evaluateDiscount(deal({ quotedPrice: 55_000 }));
    expect(r.approvalRequired).toBe("cro");
  });

  it("above 65% blanket ceiling requires CEO", () => {
    const r = evaluateDiscount(deal({ quotedPrice: 25_000 }));
    expect(r.approvalRequired).toBe("ceo");
  });
});

describe("evaluateDiscount — margin floors", () => {
  it("margin below CFO floor fires warning", () => {
    const r = evaluateDiscount(deal({
      listPrice: 100_000,
      quotedPrice: 50_000, // 50% discount
      costOfGoodsPct: 0.2,
    }));
    // margin = (100k - 20k - 50k)/100k = 30% → below cfoFloorPct 40%
    expect(r.flags.some((f) => f.code === "margin_below_floor")).toBe(true);
  });

  it("margin below hard floor rejects deal", () => {
    const r = evaluateDiscount(deal({
      listPrice: 100_000,
      quotedPrice: 30_000,
      costOfGoodsPct: 0.5,
    }));
    expect(r.flags.some((f) => f.code === "hard_floor_breach")).toBe(true);
    expect(r.decision).toBe("reject");
  });
});

describe("evaluateDiscount — hidden bundle discount", () => {
  it("flags free line items as hidden discount", () => {
    const r = evaluateDiscount(deal({
      quotedPrice: 95_000,
      lineItems: [
        { sku: "platform", listPrice: 100_000, quotedPrice: 95_000, quantity: 1, category: "license" },
        { sku: "services-bundle", listPrice: 20_000, quotedPrice: 0, quantity: 1, category: "services", isFree: true },
      ],
    }));
    expect(r.flags.some((f) => f.code === "hidden_bundle_discount")).toBe(true);
    expect(r.effectiveDiscountPct).toBeGreaterThan(r.grossDiscountPct);
  });
});

describe("evaluateDiscount — services-heavy", () => {
  it("flags when services+training exceed 25% of deal", () => {
    const r = evaluateDiscount(deal({
      lineItems: [
        { sku: "platform", listPrice: 50_000, quotedPrice: 50_000, quantity: 1, category: "license" },
        { sku: "pro-services", listPrice: 40_000, quotedPrice: 40_000, quantity: 1, category: "services" },
      ],
      listPrice: 90_000,
      quotedPrice: 90_000,
    }));
    expect(r.flags.some((f) => f.code === "services_heavy")).toBe(true);
  });
});

describe("evaluateDiscount — short-term deep discount", () => {
  it("warns about 30%+ discount on 12-month term", () => {
    const r = evaluateDiscount(deal({
      quotedPrice: 68_000,
      termLengthMonths: 12,
    }));
    expect(r.flags.some((f) => f.code === "short_term_deep_discount")).toBe(true);
  });

  it("does not fire on 36-month term", () => {
    const r = evaluateDiscount(deal({
      quotedPrice: 68_000,
      termLengthMonths: 36,
    }));
    expect(r.flags.some((f) => f.code === "short_term_deep_discount")).toBe(false);
  });
});

describe("evaluateDiscount — strategic segment bypass", () => {
  it("flags strategic segment deals that would auto-approve", () => {
    const policy: DiscountPolicy = {
      ...DEFAULT_POLICY,
      strategicSegments: ["enterprise"],
    };
    const r = evaluateDiscount(deal({ segment: "enterprise", quotedPrice: 98_000 }), policy);
    expect(r.flags.some((f) => f.code === "strategic_segment_bypass")).toBe(true);
  });
});

describe("evaluateDiscount — rogue discount", () => {
  it("flags rep discount without competitor/strategic reason", () => {
    const r = evaluateDiscount(deal({
      quotedPrice: 90_000, // 10% discount
      segment: "smb",
      competitorInDeal: false,
    }));
    expect(r.flags.some((f) => f.code === "rogue_discount")).toBe(true);
  });
});

describe("auditDiscountLeakage", () => {
  it("sums leakage and ranks worst offenders", () => {
    const evs = [
      evaluateDiscount(deal({ id: "a", quotedPrice: 95_000 })),
      evaluateDiscount(deal({ id: "b", quotedPrice: 70_000 })),
      evaluateDiscount(deal({ id: "c", quotedPrice: 55_000 })),
    ];
    const r = auditDiscountLeakage(evs);
    expect(r.totalListPrice).toBe(300_000);
    expect(r.totalLeakage).toBe(300_000 - (95_000 + 70_000 + 55_000));
    expect(r.worstOffenders[0].dealId).toBe("c");
    expect(r.avgDiscountPct).toBeGreaterThan(0);
  });

  it("counts flag severities", () => {
    const evs = [
      evaluateDiscount(deal({ id: "a", quotedPrice: 30_000, costOfGoodsPct: 0.5 })), // hard floor
      evaluateDiscount(deal({ id: "b", quotedPrice: 68_000, termLengthMonths: 12 })), // short term deep
    ];
    const r = auditDiscountLeakage(evs);
    expect(r.criticalCount).toBeGreaterThanOrEqual(1);
    expect(r.warningCount).toBeGreaterThanOrEqual(1);
  });
});
