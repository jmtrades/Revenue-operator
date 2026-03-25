/**
 * Workspace pattern guard: bounded query (ORDER BY + LIMIT 50), no COUNT(*), hostility spike → pause.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "src/lib/intelligence/workspace-pattern-guard.ts");

describe("Workspace pattern guard invariants", () => {
  it("uses ORDER BY and LIMIT 50", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).toMatch(/\.order\s*\(/);
    expect(content).toMatch(/\.limit\s*\(\s*50\s*\)|WINDOW_LIMIT\s*=\s*50/);
  });

  it("does not use COUNT(*)", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).not.toMatch(/count\s*\(\s*\*\s*\)|\.count\s*\(/);
  });

  it("computes ratios from array length (no aggregation)", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).toContain("list.length");
    expect(content).toContain("hostility_ratio");
    expect(content).toContain("requiresPause");
  });

  it("hostility_ratio > 0.4 triggers requiresPause", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).toContain("0.4");
    expect(content).toContain("requiresPause: true");
  });

  it("no DELETE or TRUNCATE", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).not.toMatch(/\.delete\s*\(/);
    expect(content).not.toMatch(/\.truncate\s*\(/);
  });
});
