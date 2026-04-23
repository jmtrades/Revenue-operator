/**
 * Phase 53 — Pricing & deal desk engine.
 */
import { describe, it, expect } from "vitest";
import {
  evaluateDealDesk,
  type DealDeskRequest,
  type PricingRule,
} from "../src/lib/sales/pricing-deal-desk";

const RULES: PricingRule[] = [
  {
    segment: "enterprise",
    listAnnualFloor: 100_000,
    maxDiscountPctNoApproval: 0.1,
    aeApprovalCap: 0.1,
    managerApprovalCap: 0.15,
    directorApprovalCap: 0.2,
    vpApprovalCap: 0.3,
    croApprovalCap: 0.4,
    multiYearBonusPct: 0.05,
  },
  {
    segment: "mid_market",
    listAnnualFloor: 20_000,
    maxDiscountPctNoApproval: 0.1,
    aeApprovalCap: 0.1,
    managerApprovalCap: 0.15,
    directorApprovalCap: 0.2,
    vpApprovalCap: 0.25,
    croApprovalCap: 0.35,
    multiYearBonusPct: 0.05,
  },
];

function req(over: Partial<DealDeskRequest> = {}): DealDeskRequest {
  return {
    dealId: "d1",
    segment: "enterprise",
    termMonths: 12,
    listAnnualValue: 200_000,
    requestedAnnualValue: 180_000, // 10% discount
    requestedStartIso: "2026-05-01T00:00:00.000Z",
    ...over,
  };
}

describe("evaluateDealDesk — auto approve", () => {
  it("approves discounts at or below maxDiscountPctNoApproval", () => {
    const dec = evaluateDealDesk(req(), { rules: RULES });
    expect(dec.outcome).toBe("auto_approve");
    expect(dec.requestedDiscountPct).toBeCloseTo(0.1, 4);
  });
});

describe("evaluateDealDesk — manager approval", () => {
  it("requires manager for discount > 10% but <= 15%", () => {
    const dec = evaluateDealDesk(
      req({ requestedAnnualValue: 175_000 }), // 12.5%
      { rules: RULES },
    );
    expect(dec.outcome).toBe("needs_approval");
    expect(dec.approvals.map((a) => a.role)).toContain("manager");
  });
});

describe("evaluateDealDesk — director/vp escalation", () => {
  it("requires director for discount > 15%", () => {
    const dec = evaluateDealDesk(
      req({ requestedAnnualValue: 160_000 }), // 20%
      { rules: RULES },
    );
    const roles = dec.approvals.map((a) => a.role);
    expect(roles).toContain("manager");
    expect(roles).toContain("director");
  });

  it("requires VP for discount > 20%", () => {
    const dec = evaluateDealDesk(
      req({ requestedAnnualValue: 150_000 }), // 25%
      { rules: RULES },
    );
    const roles = dec.approvals.map((a) => a.role);
    expect(roles).toContain("vp");
    expect(dec.outcome).toBe("escalate");
  });
});

describe("evaluateDealDesk — CFO block on below-floor", () => {
  it("requires CFO and marks outcome=blocked when below engine floor", () => {
    const dec = evaluateDealDesk(
      req({ requestedAnnualValue: 100_000 }), // 50% discount, below floor
      { rules: RULES },
    );
    expect(dec.belowFloor).toBe(true);
    expect(dec.outcome).toBe("blocked");
    expect(dec.approvals.map((a) => a.role)).toContain("cfo");
  });
});

describe("evaluateDealDesk — suggested counter", () => {
  it("counters at segment manager cap for non-strategic deals", () => {
    const dec = evaluateDealDesk(
      req({ requestedAnnualValue: 150_000 }), // asked for 25%
      { rules: RULES },
    );
    // manager cap 15% = $170k
    expect(dec.suggestedAnnualValue).toBe(170_000);
    expect(dec.suggestedDiscountPct).toBeCloseTo(0.15, 4);
  });

  it("counters at director cap for strategic-flag deals", () => {
    const dec = evaluateDealDesk(
      req({
        segment: "enterprise",
        requestedAnnualValue: 140_000,
        flags: { strategicLogo: true },
      }),
      { rules: RULES },
    );
    // director cap 20% = $160k
    expect(dec.suggestedAnnualValue).toBe(160_000);
  });
});

describe("evaluateDealDesk — redlines", () => {
  it("adds ramped-commit redline for large discounts", () => {
    const dec = evaluateDealDesk(
      req({ requestedAnnualValue: 150_000 }),
      { rules: RULES },
    );
    expect(dec.redlines.some((r) => /ramped/i.test(r.guidance))).toBe(true);
  });

  it("adds competitive replacement redline when competitor flag set", () => {
    const dec = evaluateDealDesk(
      req({ flags: { competitorSelected: "Rival Corp" } }),
      { rules: RULES },
    );
    expect(dec.redlines.some((r) => /Competitive/i.test(r.clause))).toBe(true);
  });

  it("always includes termination-for-convenience redline", () => {
    const dec = evaluateDealDesk(req(), { rules: RULES });
    expect(dec.redlines.some((r) => /Termination/i.test(r.clause))).toBe(true);
  });

  it("multi-product bundle adds non-severability redline", () => {
    const dec = evaluateDealDesk(
      req({ flags: { multiProductBundle: true } }),
      { rules: RULES },
    );
    expect(dec.redlines.some((r) => /Bundle/i.test(r.clause))).toBe(true);
  });

  it("multi-year term triggers annual uplift redline", () => {
    const dec = evaluateDealDesk(
      req({ termMonths: 36 }),
      { rules: RULES },
    );
    expect(dec.redlines.some((r) => /Annual uplift/i.test(r.clause))).toBe(true);
  });
});

describe("evaluateDealDesk — win-rate estimation", () => {
  it("uses supplied history when sample is sufficient", () => {
    const history = Array.from({ length: 40 }, (_, i) => ({
      segment: "enterprise" as const,
      discountPct: i < 20 ? 0.05 : 0.25,
      won: i < 20, // lower discounts = won (counter-intuitive stress test)
      amount: 100_000,
    }));
    const dec = evaluateDealDesk(
      req({ requestedAnnualValue: 150_000 }), // 25%
      { rules: RULES, history, minHistoricalSample: 20 },
    );
    // Win at 25% should be near 0 from history; win at list should be near 1.
    expect(dec.expectedWinLift.holdList).toBeGreaterThan(dec.expectedWinLift.atRequested);
  });

  it("falls back to heuristic when history is thin", () => {
    const dec = evaluateDealDesk(
      req({ requestedAnnualValue: 150_000 }),
      { rules: RULES, history: [], minHistoricalSample: 20 },
    );
    expect(dec.expectedWinLift.atRequested).toBeGreaterThan(dec.expectedWinLift.holdList);
  });
});

describe("evaluateDealDesk — commentary", () => {
  it("includes commentary lines for blocked deals", () => {
    const dec = evaluateDealDesk(
      req({ requestedAnnualValue: 80_000 }),
      { rules: RULES },
    );
    expect(dec.commentary.some((c) => /CFO/i.test(c))).toBe(true);
  });

  it("includes strategic-logo note when flag present", () => {
    const dec = evaluateDealDesk(
      req({ flags: { strategicLogo: true } }),
      { rules: RULES },
    );
    expect(dec.commentary.some((c) => /Strategic/i.test(c))).toBe(true);
  });
});
