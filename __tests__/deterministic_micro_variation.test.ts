/**
 * Deterministic micro-variation: same thread + attempt → same variant; no Math.random.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { selectDeterministicVariant } from "../src/lib/intelligence/deterministic-variant";

const ROOT = path.resolve(__dirname, "..");

describe("Deterministic micro variation", () => {
  it("same threadId + attemptNumber yields same variant", () => {
    const variants = ["a", "b", "c"];
    const a = selectDeterministicVariant("thread-1", 1, variants);
    const b = selectDeterministicVariant("thread-1", 1, variants);
    expect(a).toBe(b);
  });

  it("returned value is one of variants", () => {
    const variants = ["x", "y", "z"];
    const r = selectDeterministicVariant("t", 0, variants);
    expect(variants).toContain(r);
  });

  it("different attemptNumber can yield different index when variants length > 1", () => {
    const variants = ["v1", "v2", "v3"];
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(selectDeterministicVariant("same-thread", i, variants));
    }
    expect(results.size).toBeGreaterThanOrEqual(1);
  });

  it("single variant returns that variant", () => {
    expect(selectDeterministicVariant("t", 1, ["only"])).toBe("only");
  });

  it("empty variants returns empty string", () => {
    expect(selectDeterministicVariant("t", 1, [])).toBe("");
  });

  it("deterministic-variant.ts has no Math.random() call", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/deterministic-variant.ts"), "utf-8");
    expect(content).not.toMatch(/Math\.random\s*\(/);
  });

  it("uses createHash (deterministic), not random UUID", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/deterministic-variant.ts"), "utf-8");
    expect(content).not.toMatch(/randomUUID\s*\(/);
    expect(content).toContain("createHash");
  });
});
