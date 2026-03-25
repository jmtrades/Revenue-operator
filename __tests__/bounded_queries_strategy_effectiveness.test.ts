/**
 * Strategy effectiveness: all reads bounded (ORDER BY + LIMIT).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "src/lib/intelligence/strategy-effectiveness.ts");

describe("Bounded queries strategy effectiveness", () => {
  it("uses ORDER BY and LIMIT", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).toMatch(/\.order\s*\(/);
    expect(content).toMatch(/\.limit\s*\(/);
  });

  it("window limit is 200", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).toContain("WINDOW_LIMIT");
    expect(content).toContain("200");
  });
});
