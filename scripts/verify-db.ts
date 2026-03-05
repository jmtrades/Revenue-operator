#!/usr/bin/env npx tsx
/**
 * Verify database is working: (1) Postgres via DATABASE_URL, (2) Supabase API via URL + key.
 * Loads .env / .env.local. Usage: npm run verify:db
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnv(): void {
  for (const name of [".env", ".env.local"]) {
    const p = path.join(ROOT, name);
    if (!existsSync(p)) continue;
    const content = readFileSync(p, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1).replace(/\\n/g, "\n");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadEnv();

const KEY_TABLES = ["users", "workspaces", "settings", "leads", "conversations"] as const;

async function checkPostgres(): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "";
  if (!dbUrl.startsWith("postgres")) return false;
  try {
    const pg = await import("pg");
    const client = new pg.default.Client({ connectionString: dbUrl });
    await client.connect();
    const r = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'revenue_operator' AND table_name = ANY($1) ORDER BY table_name",
      [KEY_TABLES as unknown as string[]]
    );
    await client.end();
    return Array.isArray(r.rows) && r.rows.length >= KEY_TABLES.length;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log("Database verification\n");

  let ok = true;

  const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "";
  if (dbUrl.startsWith("postgres")) {
    const pgOk = await checkPostgres();
    if (pgOk) {
      console.log("  ✓ Postgres (DATABASE_URL): connected, revenue_operator tables present");
    } else {
      console.error("  ✗ Postgres: connection failed or revenue_operator tables missing. Run: npm run db:migrate");
      ok = false;
    }
  } else {
    console.log("  − Postgres: DATABASE_URL not set (skip direct check)");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim()) {
    console.error("  ✗ NEXT_PUBLIC_SUPABASE_URL not set. Add to .env.local (app needs it for all DB access).");
    ok = false;
  } else if (!key?.trim()) {
    console.error("  ✗ SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) not set. Copy from Supabase Dashboard > Project Settings > API or from Vercel.");
    ok = false;
  } else {
    try {
      const { getDb } = await import("../src/lib/db/queries");
      const db = getDb();
      for (const table of KEY_TABLES) {
        const { error } = await db.from(table).select("id").limit(1).maybeSingle();
        if (error) {
          console.error(`  ✗ Supabase API ${table}: ${error.message}`);
          ok = false;
        }
      }
      if (ok) {
        console.log("  ✓ Supabase API: connected, revenue_operator schema readable");
        console.log("    (If you see schema errors, add 'revenue_operator' to Project Settings > API > Exposed schemas)");
      }
    } catch (err) {
      console.error("  ✗ Supabase API:", err instanceof Error ? err.message : err);
      ok = false;
    }
  }

  console.log("");
  if (!ok) process.exit(1);
  console.log("  Database OK.");
}

main();
