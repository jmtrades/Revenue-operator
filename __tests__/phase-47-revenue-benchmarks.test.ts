/**
 * Phase 47 — Revenue operations benchmarks.
 */

import { describe, it, expect } from "vitest";
import {
  computeBenchmarks,
  percentileOf,
  percentileBand,
  type DealSnapshot,
} from "../src/lib/sales/revenue-benchmarks";

function deal(over: Partial<DealSnapshot> = {}): DealSnapshot {
  return {
    dealId: "d1",
    createdAtIso: "2026-01-01T00:00:00.000Z",
    closedAtIso: "2026-02-01T00:00:00.000Z",
    outcome: "won",
    amount: 50_000,
    stage: "closed_won",
    ...over,
  };
}

describe("percentileOf + percentileBand", () => {
  it("median of [1..5] is 3", () => {
    expect(percentileOf([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  it("band of [1..10] has p25=3.25, p50=5.5, p75=7.75, p90=9.1", () => {
    const b = percentileBand([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(b.p25).toBeCloseTo(3.25, 2);
    expect(b.p50).toBeCloseTo(5.5, 2);
    expect(b.p75).toBeCloseTo(7.75, 2);
    expect(b.p90).toBeCloseTo(9.1, 2);
    expect(b.n).toBe(10);
  });

  it("empty returns zeros", () => {
    const b = percentileBand([]);
    expect(b.p50).toBe(0);
    expect(b.n).toBe(0);
  });
});

describe("computeBenchmarks — velocity math", () => {
  it("winRate = won / (won+lost); open excluded from winRate denominator", () => {
    const current: DealSnapshot[] = [
      deal({ dealId: "w1", outcome: "won" }),
      deal({ dealId: "w2", outcome: "won" }),
      deal({ dealId: "l1", outcome: "lost" }),
      deal({ dealId: "o1", outcome: "open", closedAtIso: undefined }),
    ];
    const r = computeBenchmarks({ current });
    expect(r.overall.winRate).toBeCloseTo(2 / 3, 4);
    expect(r.overall.openCount).toBe(1);
  });

  it("avgDealSize averages won-only amounts", () => {
    const current: DealSnapshot[] = [
      deal({ dealId: "w1", outcome: "won", amount: 100_000 }),
      deal({ dealId: "w2", outcome: "won", amount: 50_000 }),
      deal({ dealId: "l1", outcome: "lost", amount: 999_999 }),
    ];
    const r = computeBenchmarks({ current });
    expect(r.overall.avgDealSize).toBe(75_000);
  });

  it("velocity = opps * winRate * avgDealSize / avgCycleDays", () => {
    const current: DealSnapshot[] = [
      deal({
        dealId: "w1",
        outcome: "won",
        amount: 50_000,
        createdAtIso: "2026-01-01T00:00:00.000Z",
        closedAtIso: "2026-01-31T00:00:00.000Z", // 30 days
      }),
      deal({
        dealId: "w2",
        outcome: "won",
        amount: 50_000,
        createdAtIso: "2026-01-01T00:00:00.000Z",
        closedAtIso: "2026-01-31T00:00:00.000Z",
      }),
    ];
    const r = computeBenchmarks({ current });
    // 2 opps * 1.0 * 50000 / 30 = 3333.33
    expect(r.overall.velocityPerDay).toBeCloseTo((2 * 1.0 * 50_000) / 30, 2);
  });
});

describe("computeBenchmarks — stage duration percentiles", () => {
  it("computes per-stage percentile bands", () => {
    const current: DealSnapshot[] = [
      deal({
        dealId: "d1",
        stageHistory: [
          { stage: "discovery", enteredAtIso: "2026-01-01T00:00:00.000Z", exitedAtIso: "2026-01-11T00:00:00.000Z" }, // 10d
          { stage: "proposal", enteredAtIso: "2026-01-11T00:00:00.000Z", exitedAtIso: "2026-01-21T00:00:00.000Z" }, // 10d
        ],
      }),
      deal({
        dealId: "d2",
        stageHistory: [
          { stage: "discovery", enteredAtIso: "2026-01-01T00:00:00.000Z", exitedAtIso: "2026-01-31T00:00:00.000Z" }, // 30d
        ],
      }),
    ];
    const r = computeBenchmarks({ current });
    const disc = r.stageDurations.find((s) => s.stage === "discovery");
    expect(disc?.sample).toBe(2);
    expect(disc?.meanDays).toBe(20);
  });
});

describe("computeBenchmarks — conversion rates", () => {
  it("computes stage-to-stage conversion", () => {
    const current: DealSnapshot[] = [
      deal({
        dealId: "d1",
        stageHistory: [
          { stage: "qualification", enteredAtIso: "2026-01-01T00:00:00.000Z", exitedAtIso: "2026-01-05T00:00:00.000Z" },
          { stage: "proposal", enteredAtIso: "2026-01-05T00:00:00.000Z" },
        ],
      }),
      deal({
        dealId: "d2",
        stageHistory: [
          { stage: "qualification", enteredAtIso: "2026-01-01T00:00:00.000Z", exitedAtIso: "2026-01-05T00:00:00.000Z" },
          { stage: "proposal", enteredAtIso: "2026-01-05T00:00:00.000Z" },
        ],
      }),
      deal({
        dealId: "d3",
        stageHistory: [
          { stage: "qualification", enteredAtIso: "2026-01-01T00:00:00.000Z" },
        ],
      }),
    ];
    const r = computeBenchmarks({ current });
    const qp = r.conversionRates.find((c) => c.fromStage === "qualification" && c.toStage === "proposal");
    expect(qp?.denom).toBe(3);
    expect(qp?.count).toBe(2);
    expect(qp?.rate).toBeCloseTo(2 / 3, 4);
  });
});

describe("computeBenchmarks — segment slicing", () => {
  it("segments and ICP bands are sliced independently", () => {
    const current: DealSnapshot[] = [
      deal({ dealId: "e1", segment: "enterprise", icpScoreBand: "A" }),
      deal({ dealId: "e2", segment: "enterprise", icpScoreBand: "A" }),
      deal({ dealId: "s1", segment: "smb", icpScoreBand: "C", outcome: "lost" }),
    ];
    const r = computeBenchmarks({ current });
    const ent = r.bySegment.find((s) => s.key === "enterprise");
    const smb = r.bySegment.find((s) => s.key === "smb");
    expect(ent?.metrics.opportunities).toBe(2);
    expect(smb?.metrics.winRate).toBe(0);

    const a = r.byIcp.find((s) => s.key === "A");
    expect(a?.metrics.opportunities).toBe(2);
  });
});

describe("computeBenchmarks — drift", () => {
  it("reports up/down/flat trends", () => {
    const prior: DealSnapshot[] = [
      deal({ dealId: "p1", outcome: "won", amount: 40_000 }),
      deal({ dealId: "p2", outcome: "lost" }),
    ];
    const current: DealSnapshot[] = [
      deal({ dealId: "c1", outcome: "won", amount: 80_000 }),
      deal({ dealId: "c2", outcome: "won", amount: 80_000 }),
    ];
    const r = computeBenchmarks({ current, prior });
    const dealSizeDrift = r.drift.find((d) => d.metric === "avgDealSize");
    expect(dealSizeDrift?.direction).toBe("up");
    expect(dealSizeDrift?.relativeDelta).toBeGreaterThan(0.5);
  });

  it("empty prior → no drift reported", () => {
    const r = computeBenchmarks({ current: [deal({ outcome: "won" })] });
    expect(r.drift).toEqual([]);
  });
});

describe("computeBenchmarks — outliers", () => {
  it("flags extreme deal size and cycle days", () => {
    const current: DealSnapshot[] = [
      ...Array.from({ length: 5 }, (_, i) =>
        deal({
          dealId: `typical-${i}`,
          outcome: "won",
          amount: 50_000,
          createdAtIso: "2026-01-01T00:00:00.000Z",
          closedAtIso: "2026-01-30T00:00:00.000Z",
        }),
      ),
      deal({
        dealId: "whale",
        outcome: "won",
        amount: 5_000_000,
        createdAtIso: "2026-01-01T00:00:00.000Z",
        closedAtIso: "2026-01-30T00:00:00.000Z",
      }),
    ];
    const r = computeBenchmarks({ current });
    expect(r.outliers.some((o) => o.dealId === "whale" && o.metric === "dealSize")).toBe(true);
  });

  it("zero outliers when sample < 3", () => {
    const current: DealSnapshot[] = [
      deal({ dealId: "w1", outcome: "won" }),
      deal({ dealId: "w2", outcome: "won" }),
    ];
    const r = computeBenchmarks({ current });
    expect(r.outliers).toEqual([]);
  });
});

describe("computeBenchmarks — empty", () => {
  it("returns zeroed overall", () => {
    const r = computeBenchmarks({ current: [] });
    expect(r.overall.opportunities).toBe(0);
    expect(r.overall.winRate).toBe(0);
    expect(r.overall.velocityPerDay).toBe(0);
    expect(r.dealSizeBand.n).toBe(0);
  });
});
