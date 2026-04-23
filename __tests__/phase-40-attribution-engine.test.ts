/**
 * Phase 40 — Multi-touch attribution engine.
 */

import { describe, it, expect } from "vitest";
import {
  attributeOutcome,
  compareAttributionModels,
  channelROIRollup,
  type Touch,
  type OutcomeEvent,
} from "../src/lib/sales/attribution-engine";

function touch(over: Partial<Touch>): Touch {
  return {
    id: "t",
    accountId: "acct",
    type: "organic_search",
    at: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const OUTCOME: OutcomeEvent = {
  accountId: "acct",
  value: 100_000,
  at: "2026-04-20T00:00:00.000Z",
  type: "revenue",
};

const JOURNEY: Touch[] = [
  touch({ id: "t1", type: "organic_search", at: "2026-01-05T00:00:00.000Z" }),
  touch({ id: "t2", type: "content_download", at: "2026-01-20T00:00:00.000Z" }),
  touch({ id: "t3", type: "webinar", at: "2026-02-10T00:00:00.000Z", createdOpportunity: true }),
  touch({ id: "t4", type: "email", at: "2026-03-01T00:00:00.000Z" }),
  touch({ id: "t5", type: "sdr_outbound", at: "2026-04-15T00:00:00.000Z" }),
];

describe("attributeOutcome — first_touch", () => {
  it("gives 100% to first touch", () => {
    const r = attributeOutcome(JOURNEY, { model: "first_touch", outcome: OUTCOME });
    expect(r.allocations[0].credit).toBe(100_000);
    expect(r.allocations[0].touchId).toBe("t1");
    expect(r.allocations.slice(1).every((a) => a.credit === 0)).toBe(true);
  });
});

describe("attributeOutcome — last_touch", () => {
  it("gives 100% to last touch", () => {
    const r = attributeOutcome(JOURNEY, { model: "last_touch", outcome: OUTCOME });
    expect(r.allocations[r.allocations.length - 1].credit).toBe(100_000);
    expect(r.allocations[r.allocations.length - 1].touchId).toBe("t5");
  });
});

describe("attributeOutcome — linear", () => {
  it("splits evenly", () => {
    const r = attributeOutcome(JOURNEY, { model: "linear", outcome: OUTCOME });
    for (const a of r.allocations) {
      expect(a.credit).toBeCloseTo(20_000, 3);
    }
  });
});

describe("attributeOutcome — u_shaped", () => {
  it("40% first, 40% last, 20% middle split", () => {
    const r = attributeOutcome(JOURNEY, { model: "u_shaped", outcome: OUTCOME });
    expect(r.allocations[0].credit).toBeCloseTo(40_000, 3);
    expect(r.allocations[r.allocations.length - 1].credit).toBeCloseTo(40_000, 3);
    const middleSum = r.allocations.slice(1, -1).reduce((a, b) => a + b.credit, 0);
    expect(middleSum).toBeCloseTo(20_000, 3);
  });
});

describe("attributeOutcome — w_shaped", () => {
  it("30% first, 30% opp-create, 30% last, 10% middle", () => {
    const r = attributeOutcome(JOURNEY, { model: "w_shaped", outcome: OUTCOME });
    expect(r.allocations[0].credit).toBeCloseTo(30_000, 3);
    expect(r.allocations[r.allocations.length - 1].credit).toBeCloseTo(30_000, 3);
    const oppTouch = r.allocations.find((a) => a.touchId === "t3")!;
    expect(oppTouch.credit).toBeCloseTo(30_000, 3);
  });

  it("falls back to u_shaped-like behavior when no opp-create touch", () => {
    const noOpp = JOURNEY.map((t) => ({ ...t, createdOpportunity: false }));
    const r = attributeOutcome(noOpp, { model: "w_shaped", outcome: OUTCOME });
    // 45% first, 45% last, 10% middle (2 primary, middle has rest)
    expect(r.allocations[0].credit).toBeCloseTo(45_000, 3);
    expect(r.allocations[r.allocations.length - 1].credit).toBeCloseTo(45_000, 3);
  });
});

describe("attributeOutcome — time_decay", () => {
  it("later touches get more credit", () => {
    const r = attributeOutcome(JOURNEY, {
      model: "time_decay",
      outcome: OUTCOME,
      halfLifeDays: 14,
    });
    const first = r.allocations.find((a) => a.touchId === "t1")!;
    const last = r.allocations.find((a) => a.touchId === "t5")!;
    expect(last.credit).toBeGreaterThan(first.credit);
  });

  it("all credits sum to outcome value", () => {
    const r = attributeOutcome(JOURNEY, {
      model: "time_decay",
      outcome: OUTCOME,
      halfLifeDays: 30,
    });
    const total = r.allocations.reduce((a, b) => a + b.credit, 0);
    expect(total).toBeCloseTo(100_000, 3);
  });
});

describe("attributeOutcome — position_weighted", () => {
  it("applies custom position weights and normalizes", () => {
    const r = attributeOutcome(JOURNEY, {
      model: "position_weighted",
      outcome: OUTCOME,
      positionWeights: [0.5, 0.1, 0.4], // front-heavy + back-heavy, skinny middle
    });
    const total = r.allocations.reduce((a, b) => a + b.credit, 0);
    expect(total).toBeCloseTo(100_000, 3);
  });
});

describe("attributeOutcome — filters post-outcome touches", () => {
  it("touches after outcome get zero allocation and aren't in list", () => {
    const withFuture = [
      ...JOURNEY,
      touch({ id: "future", type: "email", at: "2026-05-01T00:00:00.000Z" }),
    ];
    const r = attributeOutcome(withFuture, { model: "linear", outcome: OUTCOME });
    expect(r.allocations.find((a) => a.touchId === "future")).toBeUndefined();
  });
});

describe("attributeOutcome — channel summary", () => {
  it("aggregates credit per channel with share", () => {
    const r = attributeOutcome(JOURNEY, { model: "linear", outcome: OUTCOME });
    const shareSum = r.channelSummary.reduce((a, b) => a + b.share, 0);
    expect(shareSum).toBeCloseTo(1, 3);
  });
});

describe("compareAttributionModels", () => {
  it("reports swing % per channel across models", () => {
    const r = compareAttributionModels(JOURNEY, OUTCOME, [
      "first_touch",
      "last_touch",
      "linear",
      "time_decay",
    ]);
    expect(Object.keys(r.byModel).length).toBe(4);
    expect(r.channelSwing.length).toBeGreaterThan(0);
    expect(r.channelSwing[0].swingPct).toBeGreaterThanOrEqual(0);
  });
});

describe("channelROIRollup", () => {
  it("computes ROI = (credit - cost) / cost", () => {
    const attr = attributeOutcome(JOURNEY, { model: "linear", outcome: OUTCOME });
    const costs = new Map<string, number>([
      ["t1", 100],
      ["t2", 500],
      ["t3", 2_000],
      ["t4", 50],
      ["t5", 1_500],
    ]);
    const roi = channelROIRollup([attr], costs);
    expect(roi.length).toBeGreaterThan(0);
    for (const row of roi) {
      if (row.cost > 0) {
        expect(row.roi).toBeCloseTo((row.credit - row.cost) / row.cost, 3);
      }
    }
  });
});
