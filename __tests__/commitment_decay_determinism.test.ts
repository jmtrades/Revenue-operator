/**
 * Commitment decay: deterministic. Same input → same output. No timers.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { applyCommitmentDecay } from "../src/lib/intelligence/commitment-decay";

const ROOT = path.resolve(__dirname, "..");

describe("Commitment decay determinism", () => {
  it("same input yields same output", () => {
    const input = { lastMeaningfulOutcomeAt: null, openCommitmentsCount: 0, daysSinceLastResponse: 7, goodwillScore: 50 };
    const a = applyCommitmentDecay(input);
    const b = applyCommitmentDecay(input);
    expect(a).toEqual(b);
  });

  it("3 days silence → goodwill delta -5", () => {
    const r = applyCommitmentDecay({
      lastMeaningfulOutcomeAt: null,
      openCommitmentsCount: 0,
      daysSinceLastResponse: 3,
      goodwillScore: 50,
    });
    expect(r.goodwillDelta).toBe(-5);
  });

  it("7 days silence → goodwill delta -10", () => {
    const r = applyCommitmentDecay({
      lastMeaningfulOutcomeAt: null,
      openCommitmentsCount: 0,
      daysSinceLastResponse: 7,
      goodwillScore: 50,
    });
    expect(r.goodwillDelta).toBe(-10);
  });

  it("14 days silence → goodwill delta -20", () => {
    const r = applyCommitmentDecay({
      lastMeaningfulOutcomeAt: null,
      openCommitmentsCount: 0,
      daysSinceLastResponse: 14,
      goodwillScore: 50,
    });
    expect(r.goodwillDelta).toBe(-20);
  });

  it("adjusted goodwill clamped 0-100", () => {
    const r = applyCommitmentDecay({
      lastMeaningfulOutcomeAt: null,
      openCommitmentsCount: 0,
      daysSinceLastResponse: 14,
      goodwillScore: 10,
    });
    expect(r.adjustedGoodwill).toBeGreaterThanOrEqual(0);
    expect(r.adjustedGoodwill).toBeLessThanOrEqual(100);
  });

  it("no Math.random or randomUUID in commitment-decay", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/commitment-decay.ts"), "utf-8");
    expect(content).not.toMatch(/Math\.random\s*\(/);
    expect(content).not.toMatch(/randomUUID\s*\(/);
  });
});
