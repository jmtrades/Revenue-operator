/**
 * Goodwill engine: clamp 0-100. Risk boost < 20. Force review < 10.
 */

import { describe, it, expect } from "vitest";
import {
  computeGoodwill,
  goodwillRequiresRiskBoost,
  goodwillRequiresForceReview,
} from "../src/lib/intelligence/goodwill-engine";

describe("Goodwill bounds", () => {
  it("computeGoodwill clamps to 0-100", () => {
    expect(computeGoodwill({ previousGoodwill: 50, brokenCommitmentsDelta: 10 })).toBe(0);
    expect(computeGoodwill({ previousGoodwill: 50, fulfilledCommitmentsDelta: 10 })).toBe(100);
  });

  it("goodwillRequiresRiskBoost true when score < 20", () => {
    expect(goodwillRequiresRiskBoost(19)).toBe(true);
    expect(goodwillRequiresRiskBoost(20)).toBe(false);
  });

  it("goodwillRequiresForceReview true when score < 10", () => {
    expect(goodwillRequiresForceReview(9)).toBe(true);
    expect(goodwillRequiresForceReview(10)).toBe(false);
  });

  it("fulfilled commitment increases score", () => {
    const before = computeGoodwill({ previousGoodwill: 50 });
    const after = computeGoodwill({ previousGoodwill: 50, fulfilledCommitmentsDelta: 1 });
    expect(after).toBeGreaterThan(before);
  });

  it("broken commitment decreases score", () => {
    const before = computeGoodwill({ previousGoodwill: 50 });
    const after = computeGoodwill({ previousGoodwill: 50, brokenCommitmentsDelta: 1 });
    expect(after).toBeLessThan(before);
  });
});
