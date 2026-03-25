/**
 * Commitment registry and escalation memory: all queries use ORDER BY + LIMIT.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Bounded queries in commitment and escalation", () => {
  it("commitment-registry uses limit in getOpenCommitments and getBrokenCommitmentsCount", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/commitment-registry.ts"), "utf-8");
    expect(content).toMatch(/\.limit\s*\(\s*OPEN_LIMIT\s*\)|\.limit\s*\(\s*\d+\s*\)/);
    expect(content).toMatch(/\.order\s*\(/);
  });

  it("escalation-memory uses limit in getLastNIntentActions", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/escalation-memory.ts"), "utf-8");
    expect(content).toContain(".limit(");
    expect(content).toContain("order(");
  });
});
