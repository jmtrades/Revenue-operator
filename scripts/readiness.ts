/**
 * Deployment readiness: env, db, cron secret, pipeline health.
 * Exit non-zero if unsafe to run. Usage: npm run readiness
 */

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
] as const;

function has(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

async function checkDb(): Promise<boolean> {
  try {
    const { getDb } = await import("../src/lib/db/queries");
    const db = getDb();
    const { error } = await db.from("workspaces").select("id").limit(1).maybeSingle();
    return !error;
  } catch {
    return false;
  }
}

async function checkHealth(): Promise<boolean> {
  try {
    const { runPipelineHealthCheck } = await import("../src/lib/system/health-check");
    const result = await runPipelineHealthCheck();
    return result.ok;
  } catch {
    return false;
  }
}

async function main() {
  let failed = false;

  console.log("Readiness checks:\n");

  if (process.env.NODE_ENV === "production" && process.env.DISABLE_UNSAFE_WRITE_GUARD === "true") {
    console.error("  ✗ production must not set DISABLE_UNSAFE_WRITE_GUARD=true (unsafe write guard is required)");
    failed = true;
  } else if (process.env.NODE_ENV === "production") {
    console.log("  ✓ unsafe write guard required in production (not disabled)");
  }

  for (const name of REQUIRED) {
    const ok = has(name);
    console.log(`  ${ok ? "✓" : "✗"} env ${name}`);
    if (!ok) failed = true;
  }

  const dbOk = await checkDb();
  console.log(`  ${dbOk ? "✓" : "✗"} db connectivity`);
  if (!dbOk) failed = true;

  const healthOk = await checkHealth();
  console.log(`  ${healthOk ? "✓" : "✗"} pipeline health (dry-run)`);
  if (!healthOk) failed = true;

  console.log("");
  if (failed) {
    console.error("Readiness failed. Do not deploy.");
    process.exit(1);
  }
  console.log("Readiness OK.");
}

main();
