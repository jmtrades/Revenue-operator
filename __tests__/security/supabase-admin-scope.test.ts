/**
 * Static-analysis test: enforce that the service-role-bypass Supabase client
 * is imported only from explicitly allowed call-sites.
 *
 * Related plan: docs/superpowers/plans/2026-04-22-phase-78-100b-remediation.md
 *   Phase 2 — Database Access Boundary Restoration
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const ALLOWED_PREFIXES: readonly string[] = [
  "src/app/api/webhooks/",
  "scripts/",
  "src/app/api/auth/signup/",
  "src/app/api/auth/google/callback/",
  "src/app/api/brain/bootstrap/",
  "src/lib/intelligence/brain-migration.ts",
  "src/app/api/cron/",
  "src/lib/workflows/scheduler.ts",
  // Transitional: `getDb()` is the legacy admin-wrapped DB accessor used
  // broadly across the codebase. Phase 8 (RLS audit) will split this into
  // getDbAdmin / getDbAuthed and remove this entry; see JSDoc in the file.
  "src/lib/db/queries.ts",
  "src/lib/supabase/admin.ts",
  "__tests__/",
  "tests/",
];

function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      walk(full, out);
      continue;
    }
    if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const ADMIN_IMPORT_RE = /from\s+["'](?:@\/lib\/supabase\/admin|(?:\.\.\/)+lib\/supabase\/admin|\.\/admin)["']/;

describe("supabase admin client scope", () => {
  it("is imported only from explicitly allowed paths", () => {
    const files = [
      ...walk(path.join(REPO_ROOT, "src")),
      ...walk(path.join(REPO_ROOT, "scripts")),
      ...walk(path.join(REPO_ROOT, "tests")),
    ];
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      if (!ADMIN_IMPORT_RE.test(content)) continue;
      const rel = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
      const ok = ALLOWED_PREFIXES.some((p) => rel === p || rel.startsWith(p));
      if (!ok) offenders.push(rel);
    }
    expect(
      offenders,
      `src/lib/supabase/admin.ts was imported from ${offenders.length} forbidden call-site(s):\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("no other file constructs a service-role Supabase client directly", () => {
    const files = [
      ...walk(path.join(REPO_ROOT, "src")),
    ];
    const offenders: string[] = [];
    // Match createClient(url, SERVICE_ROLE_KEY) or createClient(_, SERVICE_ROLE_KEY).
    // We're conservative: any line that references SERVICE_ROLE_KEY AND creates
    // a client (or calls Supabase with it) is suspicious.
    const SERVICE_ROLE_USE = /SUPABASE_SERVICE_ROLE_KEY/;
    const CREATE_CLIENT = /createClient\s*\(|createSupabaseJsClient\s*\(/;
    for (const file of files) {
      const rel = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
      // The admin module itself is the single sanctioned construction site.
      if (rel === "src/lib/supabase/admin.ts") continue;
      // Env-manifest files merely list variable names; no construction.
      if (
        rel === "src/lib/env.ts" ||
        rel === "src/lib/env-check.ts" ||
        rel === "src/lib/env/validate.ts" ||
        rel === "src/lib/runtime/validate-environment.ts"
      ) continue;
      const content = fs.readFileSync(file, "utf8");
      if (!SERVICE_ROLE_USE.test(content)) continue;
      if (!CREATE_CLIENT.test(content)) continue;
      offenders.push(rel);
    }
    expect(
      offenders,
      `service-role key used to construct a client outside src/lib/supabase/admin.ts:\n${offenders.join("\n")}`
    ).toEqual([]);
  });
});
