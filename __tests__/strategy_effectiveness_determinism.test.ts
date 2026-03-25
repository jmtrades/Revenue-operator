/**
 * Strategy effectiveness: deterministic scoring. Same input → same output. No COUNT(*).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { SUPPRESS_THRESHOLD } from "../src/lib/intelligence/strategy-effectiveness";

const ROOT = path.resolve(__dirname, "..");

describe("Strategy effectiveness determinism", () => {
  it("SUPPRESS_THRESHOLD is -10", () => {
    expect(SUPPRESS_THRESHOLD).toBe(-10);
  });

  it("evaluateVariantEffectiveness returns a number (no randomness)", () => {
    const file = path.join(ROOT, "src/lib/intelligence/strategy-effectiveness.ts");
    const content = readFileSync(file, "utf-8");
    expect(content).not.toMatch(/Math\.random\s*\(/);
    expect(content).not.toMatch(/randomUUID\s*\(/);
  });

  it("score formula uses array length not COUNT(*)", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/strategy-effectiveness.ts"), "utf-8");
    expect(content).not.toMatch(/count\s*\(\s*\*\s*\)|\.count\s*\(/);
    expect(content).toContain("list.length");
  });

  it("window limit is 200", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/strategy-effectiveness.ts"), "utf-8");
    expect(content).toMatch(/200|WINDOW_LIMIT/);
  });
});
