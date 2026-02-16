/**
 * Continuation engine: exposure stopped by intervention. No prediction, state + time only.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const RECORD_PATH = path.join(ROOT, "src/lib/continuation-engine/record.ts");
const TYPES_PATH = path.join(ROOT, "src/lib/continuation-engine/types.ts");

describe("Continuation engine", () => {
  it("record module defines recordContinuationStopped and countStoppedInLastDays", () => {
    const content = readFileSync(RECORD_PATH, "utf-8");
    expect(content).toContain("recordContinuationStopped");
    expect(content).toContain("countStoppedInLastDays");
    expect(content).toContain("continuation_exposures");
    expect(content).toContain("intervention_stopped_it");
  });

  it("continuation lines are factual and ≤90 chars", () => {
    const content = readFileSync(RECORD_PATH, "utf-8");
    const lines = [
      "A response delay would have continued.",
      "Attendance uncertainty would have remained.",
      "Payment would have remained incomplete.",
      "Responsibility would have remained unclear.",
    ];
    for (const line of lines) {
      expect(content).toContain(line);
      expect(line.length).toBeLessThanOrEqual(90);
    }
  });

  it("no metrics or ROI language in engine", () => {
    const record = readFileSync(RECORD_PATH, "utf-8");
    const types = readFileSync(TYPES_PATH, "utf-8");
    const combined = record + types;
    expect(combined).not.toMatch(/\b(ROI|saved|revenue|percent|efficiency|optimization|improvement)\b/i);
  });
});
