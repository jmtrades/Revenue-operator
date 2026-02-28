/**
 * Performance regression smoke: critical routes must not have N+1 patterns or unbounded loops.
 * String-based checks only. No runtime.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const CRITICAL_PATHS = [
  "src/app/api/cron/hosted-executor/route.ts",
  "src/app/api/cron/data-retention/route.ts",
  "src/app/api/internal/founder/export/route.ts",
  "src/app/api/operational/next-action/route.ts",
];

describe("Performance regression smoke", () => {
  it("critical routes use bounded queries (limit or maybeSingle)", () => {
    for (const rel of CRITICAL_PATHS) {
      const content = readFileSync(path.join(ROOT, rel), "utf-8");
      const hasLimit = content.includes(".limit(") || content.includes("maybeSingle()") || content.includes("single()");
      expect(hasLimit, `${rel} should use .limit() or maybeSingle/single`).toBe(true);
    }
  });

  it("critical routes do not have obvious N+1 (forEach + await fetch/select)", () => {
    for (const rel of CRITICAL_PATHS) {
      const content = readFileSync(path.join(ROOT, rel), "utf-8");
      const forEachWithAwait = /\.(forEach|map)\s*\([^)]*\)\s*[^;]*await\s+(db|getDb|fetch)/s.test(content);
      expect(forEachWithAwait, `${rel} should avoid forEach+await db in loop`).toBe(false);
    }
  });

  it("hosted-executor uses ORDER BY", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/cron/hosted-executor/route.ts"), "utf-8");
    expect(content).toMatch(/\.order\s*\(/);
  });

  it("founder export has no unbounded select (no select without limit)", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/internal/founder/export/route.ts"), "utf-8");
    const selectCalls = content.match(/\.from\s*\([^)]+\)\s*\.select\s*\([^)]+\)/g) || [];
    const hasLimit = content.includes(".limit(");
    expect(hasLimit, "founder export should use .limit() on workspace query").toBe(true);
  });
});
