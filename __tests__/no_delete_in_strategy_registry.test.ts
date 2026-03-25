/**
 * Strategy effectiveness registry: no DELETE, no TRUNCATE.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("No DELETE in strategy registry", () => {
  it("migration exists and has no DELETE FROM or TRUNCATE TABLE", () => {
    const p = path.join(ROOT, "supabase/migrations/strategy_effectiveness_registry.sql");
    expect(existsSync(p)).toBe(true);
    const sql = readFileSync(p, "utf-8");
    expect(sql.toLowerCase()).not.toMatch(/\bdelete\s+from\b/);
    expect(sql.toLowerCase()).not.toMatch(/\btruncate\s+table\b/);
  });

  it("strategy-effectiveness.ts has no .delete( or .truncate(", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/strategy-effectiveness.ts"), "utf-8");
    expect(content).not.toMatch(/\.delete\s*\(/);
    expect(content).not.toMatch(/\.truncate\s*\(/);
  });
});
