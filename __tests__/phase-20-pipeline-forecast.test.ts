/**
 * Phase 20 — Pipeline forecasting.
 */

import { describe, it, expect } from "vitest";
import {
  forecastPipeline,
  getDefaultStageCalibration,
  type PipelineDeal,
  type PipelineStageCalibration,
} from "../src/lib/sales/pipeline-forecast";

const NOW = "2026-04-22T12:00:00.000Z";

function dealOf(overrides: Partial<PipelineDeal> = {}): PipelineDeal {
  return {
    id: "d1",
    amount: 10000,
    stage: "proposal",
    stageEnteredAt: "2026-04-20T12:00:00.000Z",
    expectedCloseDate: "2026-05-22T12:00:00.000Z",
    ownerId: "owner-1",
    ...overrides,
  };
}

describe("getDefaultStageCalibration", () => {
  it("returns the 8-stage default ladder", () => {
    const stages = getDefaultStageCalibration();
    expect(stages.length).toBe(8);
    expect(stages[0].stage).toBe("prospect");
    expect(stages[stages.length - 1].stage).toBe("contract_out");
  });

  it("returns a copy — not the internal reference", () => {
    const a = getDefaultStageCalibration();
    const b = getDefaultStageCalibration();
    expect(a).not.toBe(b);
    a[0].weight = 999;
    expect(b[0].weight).not.toBe(999);
  });

  it("weights ascend monotonically", () => {
    const stages = getDefaultStageCalibration();
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].weight).toBeGreaterThan(stages[i - 1].weight);
    }
  });
});

describe("forecastPipeline — empty input", () => {
  it("returns zeros for empty deal list", () => {
    const f = forecastPipeline({
      deals: [],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.pipeline).toBe(0);
    expect(f.committed).toBe(0);
    expect(f.bestCase).toBe(0);
    expect(f.weightedForecast).toBe(0);
    expect(f.detail).toHaveLength(0);
    expect(Object.keys(f.byOwner)).toHaveLength(0);
  });
});

describe("forecastPipeline — per-deal formula", () => {
  it("multiplies amount × stageWeight × velocity × slip", () => {
    const deal = dealOf({
      stage: "proposal", // weight 0.6, median 10
      stageEnteredAt: "2026-04-20T12:00:00.000Z", // 2 days in-stage
      expectedCloseDate: "2026-05-22T12:00:00.000Z", // 30 days out
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    // velocity = 1 (2d <= 10d median), slip = 1 (on time)
    expect(f.detail[0].stageWeight).toBe(0.6);
    expect(f.detail[0].velocityFactor).toBe(1);
    expect(f.detail[0].slipFactor).toBe(1);
    expect(f.detail[0].contribution).toBeCloseTo(10000 * 0.6 * 1 * 1, 6);
    expect(f.weightedForecast).toBeCloseTo(6000, 6);
    expect(f.pipeline).toBe(10000);
  });

  it("velocity factor decays when stage is stale", () => {
    const deal = dealOf({
      stage: "proposal", // median 10
      stageEnteredAt: "2026-03-03T12:00:00.000Z", // 50 days in-stage → 5× median
      expectedCloseDate: "2026-05-22T12:00:00.000Z",
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    // ratio >= 3 → factor 0.5
    expect(f.detail[0].velocityFactor).toBe(0.5);
  });

  it("velocity factor interpolates between 1x and 3x median", () => {
    const deal = dealOf({
      stage: "proposal", // median 10
      stageEnteredAt: "2026-04-02T12:00:00.000Z", // 20 days = 2× median
      expectedCloseDate: "2026-05-22T12:00:00.000Z",
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    // ratio = 2 → 1 - ((2-1)/2)*0.5 = 0.75
    expect(f.detail[0].velocityFactor).toBeCloseTo(0.75, 6);
  });

  it("slip factor decays for past-due close dates", () => {
    const deal = dealOf({
      stage: "proposal",
      stageEnteredAt: "2026-04-20T12:00:00.000Z",
      expectedCloseDate: "2026-03-23T12:00:00.000Z", // 30 days past
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.detail[0].slipFactor).toBeCloseTo(0.6, 6);
  });

  it("slip factor floors at 0.3 for severely past-due deals", () => {
    const deal = dealOf({
      stage: "proposal",
      stageEnteredAt: "2026-04-20T12:00:00.000Z",
      expectedCloseDate: "2025-01-01T12:00:00.000Z", // >1 year past
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.detail[0].slipFactor).toBe(0.3);
  });

  it("slip factor = 1 when on-time", () => {
    const deal = dealOf({
      stage: "proposal",
      stageEnteredAt: "2026-04-20T12:00:00.000Z",
      expectedCloseDate: "2026-05-22T12:00:00.000Z",
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.detail[0].slipFactor).toBe(1);
  });
});

describe("forecastPipeline — aggregation tiers", () => {
  it("committed includes deals with weight >= 0.8", () => {
    const deals: PipelineDeal[] = [
      dealOf({
        id: "a",
        stage: "verbal", // 0.9
        amount: 5000,
        stageEnteredAt: NOW,
        expectedCloseDate: "2026-05-22T12:00:00.000Z",
      }),
      dealOf({
        id: "b",
        stage: "proposal", // 0.6 — NOT committed
        amount: 5000,
        stageEnteredAt: NOW,
        expectedCloseDate: "2026-05-22T12:00:00.000Z",
      }),
    ];
    const f = forecastPipeline({
      deals,
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.committed).toBeCloseTo(5000 * 0.9, 6);
  });

  it("bestCase includes deals with weight >= 0.4", () => {
    const deals: PipelineDeal[] = [
      dealOf({
        id: "a",
        stage: "demo", // 0.45 → in bestCase
        amount: 5000,
        stageEnteredAt: NOW,
        expectedCloseDate: "2026-05-22T12:00:00.000Z",
      }),
      dealOf({
        id: "b",
        stage: "discovery", // 0.3 → NOT in bestCase
        amount: 5000,
        stageEnteredAt: NOW,
        expectedCloseDate: "2026-05-22T12:00:00.000Z",
      }),
    ];
    const f = forecastPipeline({
      deals,
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.bestCase).toBeCloseTo(5000 * 0.45, 6);
  });

  it("pipeline is raw sum regardless of stage", () => {
    const deals: PipelineDeal[] = [
      dealOf({ id: "a", amount: 1000 }),
      dealOf({ id: "b", amount: 2000 }),
      dealOf({ id: "c", amount: 3000 }),
    ];
    const f = forecastPipeline({
      deals,
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.pipeline).toBe(6000);
  });
});

describe("forecastPipeline — byOwner grouping", () => {
  it("groups by ownerId", () => {
    const deals: PipelineDeal[] = [
      dealOf({ id: "a", ownerId: "alice", amount: 1000 }),
      dealOf({ id: "b", ownerId: "alice", amount: 2000 }),
      dealOf({ id: "c", ownerId: "bob", amount: 5000 }),
    ];
    const f = forecastPipeline({
      deals,
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.byOwner.alice.deals).toBe(2);
    expect(f.byOwner.alice.pipeline).toBe(3000);
    expect(f.byOwner.bob.deals).toBe(1);
    expect(f.byOwner.bob.pipeline).toBe(5000);
  });

  it("buckets unassigned owners under __unassigned__", () => {
    const deals: PipelineDeal[] = [
      dealOf({ id: "a", ownerId: null, amount: 1000 }),
      dealOf({ id: "b", ownerId: undefined, amount: 2000 }),
    ];
    const f = forecastPipeline({
      deals,
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.byOwner.__unassigned__.deals).toBe(2);
    expect(f.byOwner.__unassigned__.pipeline).toBe(3000);
  });

  it("sums weightedForecast per owner", () => {
    const deals: PipelineDeal[] = [
      dealOf({
        id: "a",
        ownerId: "alice",
        amount: 10000,
        stage: "proposal",
        stageEnteredAt: NOW,
        expectedCloseDate: "2026-05-22T12:00:00.000Z",
      }),
    ];
    const f = forecastPipeline({
      deals,
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.byOwner.alice.weightedForecast).toBeCloseTo(10000 * 0.6, 6);
  });
});

describe("forecastPipeline — unknown stage fallback", () => {
  it("assigns a 0.2 default weight for unknown stages", () => {
    const deal = dealOf({
      stage: "bizarre_custom_stage",
      stageEnteredAt: NOW,
      expectedCloseDate: "2026-05-22T12:00:00.000Z",
      amount: 1000,
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: [],
      now: NOW,
    });
    expect(f.detail[0].stageWeight).toBe(0.2);
    expect(f.detail[0].contribution).toBeCloseTo(1000 * 0.2 * 1 * 1, 6);
  });
});

describe("forecastPipeline — stage case-insensitive lookup", () => {
  it("matches stages regardless of casing", () => {
    const deal = dealOf({
      stage: "PROPOSAL",
      stageEnteredAt: NOW,
      expectedCloseDate: "2026-05-22T12:00:00.000Z",
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.detail[0].stageWeight).toBe(0.6);
  });
});

describe("forecastPipeline — custom calibration", () => {
  it("respects caller-provided stage weights", () => {
    const custom: PipelineStageCalibration[] = [
      { stage: "intro", weight: 0.1, medianDays: 5 },
      { stage: "signed", weight: 0.99, medianDays: 1 },
    ];
    const deals: PipelineDeal[] = [
      dealOf({
        id: "a",
        stage: "signed",
        stageEnteredAt: NOW,
        expectedCloseDate: "2026-05-22T12:00:00.000Z",
        amount: 1000,
      }),
    ];
    const f = forecastPipeline({ deals, stages: custom, now: NOW });
    expect(f.detail[0].stageWeight).toBe(0.99);
    expect(f.committed).toBeCloseTo(1000 * 0.99, 6);
  });
});

describe("forecastPipeline — daysInStage / daysToClose reporting", () => {
  it("reports days-in-stage correctly", () => {
    const deal = dealOf({
      stageEnteredAt: "2026-04-12T12:00:00.000Z",
      expectedCloseDate: "2026-05-02T12:00:00.000Z",
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.detail[0].daysInStage).toBe(10);
    expect(f.detail[0].daysToClose).toBe(10);
  });

  it("reports negative daysToClose for slipped deals", () => {
    const deal = dealOf({
      stageEnteredAt: "2026-04-12T12:00:00.000Z",
      expectedCloseDate: "2026-04-12T12:00:00.000Z",
    });
    const f = forecastPipeline({
      deals: [deal],
      stages: getDefaultStageCalibration(),
      now: NOW,
    });
    expect(f.detail[0].daysToClose).toBe(-10);
  });
});
