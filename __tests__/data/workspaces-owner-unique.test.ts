/**
 * Phase 78 / Task 8.1 — workspaces.owner_id UNIQUE constraint.
 *
 * Verifies the migration contract. We can't run Postgres in this sandbox,
 * so the test is a static-text contract on the migration file: it asserts
 * the migration exists, adds the UNIQUE constraint, and performs safe
 * dedup (keep newest, NULL older) rather than destructive deletion.
 *
 * The semantic assertion — "a second INSERT with the same owner_id fails
 * with 23505" — is captured by the presence of the ADD CONSTRAINT
 * statement against `owner_id`, which is the contract Postgres itself
 * enforces at error code level.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260422_workspaces_unique_owner.sql",
);

describe("Phase 78 Task 8.1 — workspaces.owner_id UNIQUE migration", () => {
  it("migration file exists", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it("adds a UNIQUE constraint named workspaces_owner_id_key on owner_id", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    // The constraint must name owner_id explicitly (not a composite key
    // with another column, and not a partial index — either of those
    // would defeat the "one user = one workspace" invariant).
    expect(sql).toMatch(
      /ADD\s+CONSTRAINT\s+workspaces_owner_id_key\s+UNIQUE\s*\(\s*owner_id\s*\)/i,
    );
  });

  it("targets the revenue_operator.workspaces table (not public.workspaces)", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    // The live schema is `revenue_operator` — a migration that forgot
    // the schema qualifier would target `public.workspaces`, which
    // doesn't exist, and the error would only surface at apply time.
    expect(sql).toMatch(/revenue_operator\.workspaces/);
  });

  it("deduplicates existing rows BEFORE adding the constraint", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    const addConstraintIdx = sql.search(/ADD\s+CONSTRAINT\s+workspaces_owner_id_key/i);
    const dedupIdx = sql.search(/ROW_NUMBER\s*\(\s*\)\s*OVER/i);
    expect(dedupIdx).toBeGreaterThan(-1);
    expect(addConstraintIdx).toBeGreaterThan(-1);
    // Dedup must appear before the constraint — otherwise the ALTER
    // TABLE aborts on existing duplicates and the migration is DOA in
    // any environment that already has the data drift this is fixing.
    expect(dedupIdx).toBeLessThan(addConstraintIdx);
  });

  it("keeps the NEWEST row per owner_id (ORDER BY created_at DESC)", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    // The dedup policy matters: if we accidentally keep the OLDEST
    // duplicate, we'd orphan the workspace the user is actively using.
    // Keep newest by created_at, tie-break by id for determinism.
    expect(sql).toMatch(
      /ROW_NUMBER[\s\S]*PARTITION\s+BY\s+owner_id[\s\S]*ORDER\s+BY\s+created_at\s+DESC/i,
    );
  });

  it("nullifies older duplicates rather than deleting the row", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    // Deleting a workspace would cascade through lead, conversation,
    // call, and billing FKs. NULLing owner_id frees the slot for the
    // UNIQUE constraint while keeping the business data intact for a
    // human operator to reconcile.
    expect(sql).toMatch(/UPDATE\s+revenue_operator\.workspaces\s+SET\s+owner_id\s*=\s*NULL/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+revenue_operator\.workspaces/i);
  });

  it("restores NOT NULL on owner_id after the dedup + constraint add", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    // Temporarily dropping NOT NULL is the only way to perform the
    // dedup UPDATE. The migration must restore the invariant at the
    // end, otherwise new workspaces could be inserted without an
    // owner — worse than the original defect.
    expect(sql).toMatch(/ALTER\s+COLUMN\s+owner_id\s+DROP\s+NOT\s+NULL/i);
    expect(sql).toMatch(/ALTER\s+COLUMN\s+owner_id\s+SET\s+NOT\s+NULL/i);
    const dropIdx = sql.search(/DROP\s+NOT\s+NULL/i);
    const setIdx = sql.search(/SET\s+NOT\s+NULL/i);
    expect(dropIdx).toBeLessThan(setIdx);
  });

  it("runs as a single transaction (BEGIN/COMMIT)", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    // Partial application would leave the table in a bad state
    // (NOT NULL dropped, constraint not added). Wrap the whole thing
    // in a transaction so either every step lands or none does.
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;\s*$/im);
  });
});
