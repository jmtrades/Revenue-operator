import { describe, it, expect } from "vitest";
import { getWarmupLimit } from "../src/lib/warmup";

describe("Warm-up limits", () => {
  it("Day 0-1: 20/day", () => {
    const created = new Date();
    expect(getWarmupLimit(created)).toBe(20);
    const yesterday = new Date(Date.now() - 12 * 60 * 60 * 1000);
    expect(getWarmupLimit(yesterday)).toBe(20);
  });

  it("Day 2-3: 50/day", () => {
    const twoDaysAgo = new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000);
    expect(getWarmupLimit(twoDaysAgo)).toBe(50);
  });

  it("Day 4-7: 150/day", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(getWarmupLimit(fiveDaysAgo)).toBe(150);
  });

  it("Day 8+: unlimited", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(getWarmupLimit(tenDaysAgo)).toBe(Number.POSITIVE_INFINITY);
  });
});
