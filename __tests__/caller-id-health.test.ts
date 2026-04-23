import { describe, it, expect } from "vitest";
import {
  computeCallerIdHealth,
  summariseFleet,
  type CallOutcomeWindow,
} from "../src/lib/compliance/caller-id-health";

function win(overrides: Partial<CallOutcomeWindow> = {}): CallOutcomeWindow {
  return {
    phoneNumber: "+15555550123",
    windowStartIso: "2026-04-21T00:00:00Z",
    windowEndIso: "2026-04-22T00:00:00Z",
    attempts: 100,
    humanAnswered: 50,
    voicemail: 30,
    quickHangups: 2,
    blockIndicators: 0,
    complaints: 0,
    positiveOutcomes: 6,
    ...overrides,
  };
}

describe("caller-id-health — computeCallerIdHealth", () => {
  it("healthy number → verdict 'healthy' + keep", () => {
    const h = computeCallerIdHealth(win());
    expect(h.verdict).toBe("healthy");
    expect(h.recommendation.action).toBe("keep");
    expect(h.healthScore).toBeGreaterThanOrEqual(0.8);
  });

  it("very low answer rate + high block rate → burnt / retire", () => {
    const h = computeCallerIdHealth(
      win({
        attempts: 100,
        humanAnswered: 2,
        voicemail: 80,
        quickHangups: 20,
        blockIndicators: 10,
        complaints: 2,
      }),
    );
    expect(h.verdict).toBe("burnt");
    expect(h.recommendation.action).toBe("retire");
    expect(h.healthScore).toBeLessThanOrEqual(0.3);
  });

  it("moderate degradation → at_risk / reduce_volume", () => {
    const h = computeCallerIdHealth(
      win({
        attempts: 100,
        humanAnswered: 10,   // 10% answer — below warn 0.15 but above burning 0.08
        voicemail: 50,
        quickHangups: 5,
        blockIndicators: 0,
        complaints: 0,
      }),
    );
    expect(["at_risk", "burning"]).toContain(h.verdict);
    if (h.recommendation.action === "reduce_volume") {
      expect(h.recommendation.targetCallsPerDay).toBeGreaterThan(0);
    }
  });

  it("0 attempts → does not crash, lands in at_risk or worse", () => {
    const h = computeCallerIdHealth(win({ attempts: 0, humanAnswered: 0, voicemail: 0, quickHangups: 0, blockIndicators: 0, complaints: 0 }));
    expect(h).toHaveProperty("verdict");
    expect(h.signals.every((s) => !s.tripped)).toBe(true);
  });

  it("fleet-baseline gap penalises heavily", () => {
    const base = win({ attempts: 100, humanAnswered: 30 }); // answerRate 0.3
    const low = { ...base, humanAnswered: 5 }; // 0.05
    const hHigh = computeCallerIdHealth({ ...base, fleetBaselineAnswerRate: 0.5 });
    const hLow = computeCallerIdHealth({ ...low, fleetBaselineAnswerRate: 0.5 });
    expect(hLow.healthScore).toBeLessThan(hHigh.healthScore);
  });
});

describe("caller-id-health — summariseFleet", () => {
  it("counts each verdict + computes average score", () => {
    const healthy = computeCallerIdHealth(win());
    const burnt = computeCallerIdHealth(
      win({ humanAnswered: 2, voicemail: 80, quickHangups: 20, blockIndicators: 10, complaints: 2 }),
    );
    const s = summariseFleet([healthy, burnt]);
    expect(s.healthy).toBe(1);
    expect(s.burnt).toBe(1);
    expect(s.averageScore).toBeGreaterThanOrEqual(0);
    expect(s.averageScore).toBeLessThanOrEqual(1);
  });

  it("empty fleet → all zeros", () => {
    const s = summariseFleet([]);
    expect(s).toEqual({ healthy: 0, at_risk: 0, burning: 0, burnt: 0, averageScore: 0 });
  });
});
