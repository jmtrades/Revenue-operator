/**
 * Launch verification script
 * Runs all checks to confirm production readiness
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function checkEnvVar(name: string): boolean {
  return Boolean(process.env[name]);
}

async function verifyLaunch() {
  console.log("\n🔍 Launch Verification\n");

  let allPassed = true;

  // 1. Check Stripe setup
  log("1. Checking Stripe setup...", YELLOW);
  if (!checkEnvVar("STRIPE_SECRET_KEY")) {
    log("   ❌ STRIPE_SECRET_KEY missing", RED);
    allPassed = false;
  } else {
    log("   ✓ STRIPE_SECRET_KEY set", GREEN);
  }

  if (!checkEnvVar("STRIPE_WEBHOOK_SECRET")) {
    log("   ❌ STRIPE_WEBHOOK_SECRET missing", RED);
    allPassed = false;
  } else {
    log("   ✓ STRIPE_WEBHOOK_SECRET set", GREEN);
  }

  if (!checkEnvVar("STRIPE_PRICE_ID")) {
    log("   ⚠ STRIPE_PRICE_ID missing (run: npm run setup:stripe)", YELLOW);
  } else {
    log(`   ✓ STRIPE_PRICE_ID set (${process.env.STRIPE_PRICE_ID})`, GREEN);
  }

  // 2. Check database
  log("\n2. Checking database connection...", YELLOW);
  if (!checkEnvVar("NEXT_PUBLIC_SUPABASE_URL")) {
    log("   ❌ NEXT_PUBLIC_SUPABASE_URL missing", RED);
    allPassed = false;
  } else {
    log("   ✓ Supabase URL set", GREEN);
  }

  if (!checkEnvVar("SUPABASE_SERVICE_ROLE_KEY")) {
    log("   ❌ SUPABASE_SERVICE_ROLE_KEY missing", RED);
    allPassed = false;
  } else {
    log("   ✓ Supabase service key set", GREEN);
  }

  // 3. Check cron secret
  log("\n3. Checking cron configuration...", YELLOW);
  if (!checkEnvVar("CRON_SECRET")) {
    log("   ⚠ CRON_SECRET missing (cron routes will be unprotected)", YELLOW);
  } else {
    log("   ✓ CRON_SECRET set", GREEN);
  }

  // 4. Check session secret
  log("\n4. Checking session configuration...", YELLOW);
  if (!checkEnvVar("SESSION_SECRET")) {
    log("   ⚠ SESSION_SECRET missing (sessions disabled)", YELLOW);
  } else {
    log("   ✓ SESSION_SECRET set", GREEN);
  }

  // 5. Check Twilio
  log("\n5. Checking Twilio configuration...", YELLOW);
  if (!checkEnvVar("TWILIO_ACCOUNT_SID") || !checkEnvVar("TWILIO_AUTH_TOKEN")) {
    log("   ⚠ Twilio not configured (SMS features disabled)", YELLOW);
  } else {
    log("   ✓ Twilio configured", GREEN);
  }

  // 6. Check build
  log("\n6. Checking build...", YELLOW);
  try {
    execSync("npm run build", { stdio: "ignore", cwd: process.cwd() });
    log("   ✓ Build passes", GREEN);
  } catch {
    log("   ❌ Build failed", RED);
    allPassed = false;
  }

  // 7. Check migrations
  log("\n7. Checking migrations...", YELLOW);
  const migrationFiles = [
    "supabase/migrations/billing_trial_fields.sql",
    "supabase/migrations/trial_reminder_fields.sql",
    "supabase/migrations/webhook_events_table.sql",
  ];

  let migrationsOk = true;
  for (const file of migrationFiles) {
    if (!existsSync(join(process.cwd(), file))) {
      log(`   ⚠ Migration missing: ${file}`, YELLOW);
      migrationsOk = false;
    }
  }
  if (migrationsOk) {
    log("   ✓ Migration files present", GREEN);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  if (allPassed && migrationsOk) {
    log("✅ LAUNCH READY", GREEN);
    console.log("\nNext steps:");
    console.log("  1. Run migrations in Supabase SQL Editor");
    console.log("  2. Set up cron jobs (see LAUNCH_CHECKLIST.md)");
    console.log("  3. Test webhook: POST /api/dev/verify-stripe");
    console.log("  4. Deploy to production\n");
  } else {
    log("⚠️  NOT READY - Fix issues above", YELLOW);
    console.log("\n");
  }
}

verifyLaunch().catch((error) => {
  log(`\n❌ Verification failed: ${error}`, RED);
  process.exit(1);
});
