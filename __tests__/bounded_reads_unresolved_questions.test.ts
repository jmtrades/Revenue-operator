/**
 * Unresolved questions: all reads use ORDER BY + LIMIT.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "src/lib/intelligence/unresolved-questions.ts");

describe("Bounded reads unresolved questions", () => {
  it("getOpenQuestions uses order and limit", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).toContain("getOpenQuestions");
    expect(content).toMatch(/\.order\s*\(/);
    expect(content).toMatch(/\.limit\s*\(/);
  });

  it("resolveQuestions uses limit(1) per type", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).toContain("resolveQuestions");
    expect(content).toContain(".limit(1)");
  });
});
