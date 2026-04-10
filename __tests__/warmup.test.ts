import { describe, it, expect } from "vitest";
import { getWarmupLimit } from "@/lib/warmup";

describe("warmup limits", () => {
  it("returns 20 for workspace created today (day 0)", () => {
    const now = new Date();
    expect(getWarmupLimit(now)).toBe(20);
  });

  it("returns 20 for workspace created yesterday (day 1)", () => {
    const yesterday = new Date(Date.now() - 1 * 86400000);
    expect(getWarmupLimit(yesterday)).toBe(20);
  });

  it("returns 50 for workspace created 2 days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    expect(getWarmupLimit(twoDaysAgo)).toBe(50);
  });

  it("returns 50 for workspace created 3 days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    expect(getWarmupLimit(threeDaysAgo)).toBe(50);
  });

  it("returns 150 for workspace created 4 days ago", () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 86400000);
    expect(getWarmupLimit(fourDaysAgo)).toBe(150);
  });

  it("returns 150 for workspace created 7 days ago", () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    expect(getWarmupLimit(sevenDaysAgo)).toBe(150);
  });

  it("returns Infinity for workspace created 8+ days ago", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86400000);
    expect(getWarmupLimit(eightDaysAgo)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity for workspace created 30 days ago", () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    expect(getWarmupLimit(thirtyDaysAgo)).toBe(Number.POSITIVE_INFINITY);
  });
});
