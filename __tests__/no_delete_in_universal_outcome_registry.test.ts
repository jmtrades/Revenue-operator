/**
 * No DELETE/TRUNCATE in universal outcome registry migration or code.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("No DELETE/TRUNCATE in universal outcome registry", () => {
  it("universal_outcome_registry.sql has no DELETE FROM or TRUNCATE TABLE", () => {
    const sql = readFileSync(path.join(ROOT, "supabase/migrations/universal_outcome_registry.sql"), "utf-8");
    expect(sql.toLowerCase()).not.toMatch(/\bdelete\s+from\b/);
    expect(sql.toLowerCase()).not.toMatch(/\btruncate\s+table\b/);
  });

  it("outcome-taxonomy.ts has no .delete( or .truncate( method calls", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/outcome-taxonomy.ts"), "utf-8");
    expect(content).not.toMatch(/\.delete\s*\(/);
    expect(content).not.toMatch(/\.truncate\s*\(/);
  });
});
