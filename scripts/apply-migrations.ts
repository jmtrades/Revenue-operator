#!/usr/bin/env npx tsx
/**
 * Apply all SQL migrations in supabase/migrations in dependency order.
 * Requires DATABASE_URL or SUPABASE_DB_URL (Postgres URI). Loads .env from project root if present.
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

// Load .env / .env.local so DATABASE_URL can be set without passing on CLI
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

/** Run these first (in order); then all others alphabetically. */
const RUN_FIRST = [
  "000_base_schema.sql", // creates schema, users, workspaces, leads, settings, conversations
  "000_repair_schema.sql",
  "shared_transaction_assurance.sql",
  "orientation_layer.sql", // creates workspace_orientation_state
  "coordination_displacement_events.sql", // creates coordination_displacement_events
  "final_adoption_upgrade.sql", // creates escalation_logs
  "shared_entry_protocol.sql", // creates protocol_events
  "speech_governance_and_enterprise.sql", // creates speech_templates, workspace_roles, etc.
  "message_policies_compliance_approvals.sql", // creates message_policies
  "exposure_engine_operational_exposures.sql", // creates operational_exposures
  "reciprocal_events_threading.sql", // creates reciprocal_events
  "workspace_orientation_institutional_state.sql", // adds institutional_state to workspace_orientation_state (required by responsibility_institutional_state)
];

function orderedMigrationFiles(): string[] {
  const all = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  const first = RUN_FIRST.filter((f) => all.includes(f));
  const rest = all.filter((f) => !RUN_FIRST.includes(f)).sort();
  return [...first, ...rest];
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "";
  if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    console.error("Set DATABASE_URL or SUPABASE_DB_URL (Postgres URI) to apply migrations.");
    console.error("Example: DATABASE_URL='postgresql://postgres.[ref]:[password]@...' npx tsx scripts/apply-migrations.ts");
    process.exit(1);
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl });

  try {
    await client.connect();
  } catch (e) {
    console.error("Failed to connect to database:", (e as Error).message);
    process.exit(1);
  }

  const files = orderedMigrationFiles();

  if (files.length === 0) {
    console.log("No migration files found.");
    await client.end();
    return;
  }

  console.log(`Applying ${files.length} migrations...`);
  for (const f of files) {
    const filePath = path.join(MIGRATIONS_DIR, f);
    const sql = readFileSync(filePath, "utf-8");
    try {
      await client.query(sql);
      console.log(`  OK: ${f}`);
    } catch (e) {
      console.error(`  FAIL: ${f}`, (e as Error).message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("All migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
