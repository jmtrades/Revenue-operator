/**
 * Universal outcome registry: append-only. No DELETE. No TRUNCATE.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Universal outcome registry append-only", () => {
  it("migration exists and has no DELETE FROM or TRUNCATE TABLE", () => {
    const p = path.join(ROOT, "supabase/migrations/universal_outcome_registry.sql");
    expect(existsSync(p)).toBe(true);
    const sql = readFileSync(p, "utf-8");
    expect(sql.toLowerCase()).not.toMatch(/\bdelete\s+from\b/);
    expect(sql.toLowerCase()).not.toMatch(/\btruncate\s+table\b/);
  });

  it("outcome-taxonomy.ts has no .delete( or .truncate( on universal_outcomes", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/outcome-taxonomy.ts"), "utf-8");
    expect(content).not.toMatch(/\.delete\s*\(/);
    expect(content).not.toMatch(/\.truncate\s*\(/);
  });
});
