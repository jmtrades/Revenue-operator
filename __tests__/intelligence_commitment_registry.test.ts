/**
 * Commitment registry: append-only, no DELETE/TRUNCATE, bounded queries, ledger events.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";
import {
  recordCommitment,
  markCommitmentFulfilled,
  markCommitmentBroken,
  getOpenCommitments,
  getBrokenCommitmentsCount,
} from "../src/lib/intelligence/commitment-registry";

const ROOT = path.resolve(__dirname, "..");

describe("Commitment registry invariants", () => {
  it("migration exists and has no DELETE FROM or TRUNCATE TABLE (no DDL/DML delete)", () => {
    const migrationPath = path.join(ROOT, "supabase/migrations/commitment_registry.sql");
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql.toLowerCase()).not.toMatch(/\bdelete\s+from\b/);
    expect(sql.toLowerCase()).not.toMatch(/\btruncate\s+table\b/);
  });

  it("commitment-registry.ts has no .delete( or .truncate( method calls", () => {
    const filePath = path.join(ROOT, "src/lib/intelligence/commitment-registry.ts");
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toMatch(/\.delete\s*\(/);
    expect(content).not.toMatch(/\.truncate\s*\(/);
  });

  it("commitment registry exports recordCommitment, markCommitmentFulfilled, markCommitmentBroken, getOpenCommitments, getBrokenCommitmentsCount", () => {
    expect(typeof recordCommitment).toBe("function");
    expect(typeof markCommitmentFulfilled).toBe("function");
    expect(typeof markCommitmentBroken).toBe("function");
    expect(typeof getOpenCommitments).toBe("function");
    expect(typeof getBrokenCommitmentsCount).toBe("function");
  });

  it("getOpenCommitments and getBrokenCommitmentsCount are bounded (ORDER BY + LIMIT)", () => {
    const filePath = path.join(ROOT, "src/lib/intelligence/commitment-registry.ts");
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain(".limit(");
    expect(content).toContain(".order(");
  });

  it("ledger event types commitment_recorded, commitment_fulfilled, commitment_broken exist", () => {
    const ledgerPath = path.join(ROOT, "src/lib/ops/ledger.ts");
    const content = readFileSync(ledgerPath, "utf-8");
    expect(content).toContain("commitment_recorded");
    expect(content).toContain("commitment_fulfilled");
    expect(content).toContain("commitment_broken");
  });
});
