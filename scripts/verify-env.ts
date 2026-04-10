/**
 * Environment readiness report for production.
 * Prints only variable names and status — never secret values.
 */

const REQUIRED_FOR_PRODUCTION = [
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_SECRET",
  "CRON_SECRET",
] as const;

const OPTIONAL_BUT_RECOMMENDED = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PROXY_NUMBER",
  "RESEND_API_KEY",
  "EMAIL_FROM",
];

const ENCRYPTION_KEY_ALT = "ENCRYPTION_KEY"; // Alternative to SESSION_SECRET

function has(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

function main() {
  console.log("\n--- Environment Readiness Report ---\n");
  console.log("Required for production:");
  let allRequired = true;
  for (const name of REQUIRED_FOR_PRODUCTION) {
    const ok = name === "SESSION_SECRET" ? (has("SESSION_SECRET") || has(ENCRYPTION_KEY_ALT)) : has(name);
    console.log(`  ${ok ? "✓" : "✗"} ${name}`);
    if (!ok) allRequired = false;
  }
  console.log("\nOptional (recommended):");
  for (const name of OPTIONAL_BUT_RECOMMENDED) {
    const ok = has(name);
    console.log(`  ${ok ? "✓" : "—"} ${name}`);
  }
  console.log("\n--- End Report ---\n");
  if (!allRequired) {
    console.log("Set missing required variables in your environment (or .env.local) and redeploy.");
    process.exit(1);
  }
  console.log("All required variables are set.");
}

main();
