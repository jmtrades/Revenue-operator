/**
 * Phase 78 / Task 8.3 — RLS coverage invariant.
 *
 * These tests make `revenue_operator`'s tenant-isolation invariant
 * machine-checked:
 *
 *   Every table with a tenant-scoped column (workspace_id, tenant_id,
 *   user_id, owner_id) MUST have `ENABLE ROW LEVEL SECURITY` applied in
 *   some migration.
 *
 * The invariant is enforced two ways:
 *   1. `auditMigrations()` (from `scripts/audit-rls.ts`) is run on the
 *      live `supabase/migrations/` tree. It must return `missing: []`.
 *   2. Static SQL contract tests on `20260422_rls_audit.sql` confirm the
 *      sweep migration: resolves the correct schema via pg_class, enables
 *      RLS, installs a tenant-isolation policy per table, and wraps in a
 *      single BEGIN/COMMIT.
 *
 * If a future migration lands a new tenant-scoped table without adding it
 * to the sweep (or writing its own ENABLE ROW LEVEL SECURITY), the invariant
 * test fails loudly — a CI gate against cross-tenant leak regression.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { auditMigrations } from "@/../scripts/audit-rls";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MIG_DIR = path.join(REPO_ROOT, "supabase", "migrations");
const SWEEP_FILE = path.join(MIG_DIR, "20260422_rls_audit.sql");

describe("Phase 78 Task 8.3 — RLS coverage invariant", () => {
  it("audit script file exists", () => {
    const p = path.join(REPO_ROOT, "scripts", "audit-rls.ts");
    expect(fs.existsSync(p)).toBe(true);
  });

  it("sweep migration file exists", () => {
    expect(fs.existsSync(SWEEP_FILE)).toBe(true);
  });

  it("auditMigrations reports 0 missing after the sweep is included", () => {
    const result = auditMigrations(MIG_DIR);
    // Helpful failure output: list which tables slipped through.
    if (result.missing.length > 0) {
      const preview = result.missing
        .slice(0, 10)
        .map((m) => `  ${m.name}  cols=${m.tenantCols.join(",")}  first=${m.firstFile}`)
        .join("\n");
      const msg = [
        `RLS coverage gap: ${result.missing.length} tenant-scoped table(s) lack RLS.`,
        "First 10:",
        preview,
        "Fix: add to supabase/migrations/20260422_rls_audit.sql `tables_list`",
        "or write a dedicated ENABLE ROW LEVEL SECURITY + policy block.",
      ].join("\n");
      throw new Error(msg);
    }
    expect(result.missing).toEqual([]);
    // Sanity: the sweep is not empty.
    expect(result.total).toBeGreaterThan(100);
    expect(result.covered.length).toBeGreaterThan(100);
  });

  it("audit with the sweep excluded identifies at least 150 tables lacking RLS", () => {
    // Baseline check: the sweep isn't a no-op. If we remove it from the
    // migration set, the audit should flag a large fleet of tables — that's
    // the defect this task closes. This guards against someone neutralizing
    // the sweep migration and then claiming "0 missing" by default.
    const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "rls-audit-"));
    try {
      for (const fn of fs.readdirSync(MIG_DIR)) {
        if (fn === "20260422_rls_audit.sql") continue;
        fs.copyFileSync(path.join(MIG_DIR, fn), path.join(tmp, fn));
      }
      const baseline = auditMigrations(tmp);
      expect(baseline.missing.length).toBeGreaterThanOrEqual(150);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  describe("sweep migration SQL contract", () => {
    const sql = fs.readFileSync(SWEEP_FILE, "utf8");

    it("wrapped in a single BEGIN/COMMIT", () => {
      const begins = (sql.match(/^\s*BEGIN\s*;/gim) || []).length;
      const commits = (sql.match(/^\s*COMMIT\s*;/gim) || []).length;
      expect(begins).toBe(1);
      expect(commits).toBe(1);
    });

    it("contains the dynamic ENABLE ROW LEVEL SECURITY pattern", () => {
      expect(sql).toMatch(
        /EXECUTE\s+format\(\s*'ALTER\s+TABLE\s+%I\.%I\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY'/,
      );
    });

    it("resolves the target schema from pg_class (handles both revenue_operator and public)", () => {
      expect(sql).toMatch(/FROM\s+pg_class\s+c/);
      expect(sql).toMatch(/JOIN\s+pg_namespace\s+n/);
      expect(sql).toMatch(/n\.nspname\s+IN\s*\(\s*'revenue_operator'\s*,\s*'public'\s*\)/);
    });

    it("installs a tenant_isolation policy delegating to workspace_owner_check", () => {
      expect(sql).toMatch(/pol_name\s*:=\s*tbl_name\s*\|\|\s*'_tenant_isolation'/);
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+%I\s+ON\s+%I\.%I\s+FOR\s+ALL\s+USING\s*\(\s*revenue_operator\.workspace_owner_check\(workspace_id\)\s*\)\s+WITH\s+CHECK\s*\(\s*revenue_operator\.workspace_owner_check\(workspace_id\)\s*\)/,
      );
    });

    it("drops any pre-existing tenant_isolation policy before re-creating (idempotent re-runs)", () => {
      expect(sql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+%I\s+ON\s+%I\.%I/);
    });

    it("skips tables absent from this environment rather than aborting the whole migration", () => {
      expect(sql).toMatch(/IF\s+sch_name\s+IS\s+NULL\s+THEN[\s\S]*?CONTINUE\s*;/);
    });

    it("tables_list array covers every table flagged by the sweep-excluded audit", () => {
      // Parse the sweep's tables_list, then confirm it is a superset of the
      // baseline missing list.
      const arrMatch = sql.match(
        /tables_list\s+text\[\]\s*:=\s*ARRAY\[([\s\S]*?)\]\s*;/,
      );
      expect(arrMatch).toBeTruthy();
      const listed = new Set<string>();
      for (const q of arrMatch![1].matchAll(/'([a-zA-Z_][\w]*)'/g)) {
        listed.add(q[1]);
      }
      expect(listed.size).toBeGreaterThanOrEqual(150);

      // Run audit excluding the sweep file, then cross-check.
      const tmp = fs.mkdtempSync(
        path.join(require("os").tmpdir(), "rls-audit-list-"),
      );
      try {
        for (const fn of fs.readdirSync(MIG_DIR)) {
          if (fn === "20260422_rls_audit.sql") continue;
          fs.copyFileSync(path.join(MIG_DIR, fn), path.join(tmp, fn));
        }
        const baseline = auditMigrations(tmp);
        const notCovered = baseline.missing
          .map((m) => m.name)
          .filter((n) => !listed.has(n));
        expect(notCovered).toEqual([]);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it("tables_list entries are sorted alphabetically (reviewable diffs)", () => {
      const arrMatch = sql.match(
        /tables_list\s+text\[\]\s*:=\s*ARRAY\[([\s\S]*?)\]\s*;/,
      );
      const listed: string[] = [];
      for (const q of arrMatch![1].matchAll(/'([a-zA-Z_][\w]*)'/g)) {
        listed.push(q[1]);
      }
      const sorted = [...listed].sort();
      expect(listed).toEqual(sorted);
    });
  });
});
