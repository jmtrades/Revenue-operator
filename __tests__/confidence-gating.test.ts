/**
 * Confidence gating: blocks send when below min, schedules observe when in range
 */

import { describe, it, expect } from "vitest";

const MIN_ACT = 0.55;
const MIN_SCHEDULE = 0.45;

function shouldProceed(confidence: number): "proceed" | "schedule_observe" | "inaction" {
  if (confidence >= MIN_ACT) return "proceed";
  if (confidence >= MIN_SCHEDULE) return "schedule_observe";
  return "inaction";
}

describe("confidence gating", () => {
  it("proceeds when confidence >= min_confidence_to_act", () => {
    expect(shouldProceed(0.6)).toBe("proceed");
    expect(shouldProceed(0.55)).toBe("proceed");
  });

  it("schedules observe when confidence in [min_schedule, min_act)", () => {
    expect(shouldProceed(0.5)).toBe("schedule_observe");
    expect(shouldProceed(0.45)).toBe("schedule_observe");
  });

  it("records inaction when confidence < min_schedule", () => {
    expect(shouldProceed(0.4)).toBe("inaction");
  });
});
