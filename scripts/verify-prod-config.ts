#!/usr/bin/env tsx
/**
 * Verify production configuration: required env vars, doctrine-safe output.
 * Exit code 0 if all required vars present, 1 if any missing.
 */

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "PUBLIC_VIEW_SALT",
  "FOUNDER_EXPORT_KEY",
] as const;

const CONDITIONAL_VARS = {
  billing: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const,
  billingPrice: ["STRIPE_PRICE_ID", "STRIPE_SOLO_YEARLY", "STRIPE_SOLO_MONTHLY", "STRIPE_PRICE_SOLO_MONTH", "STRIPE_PRICE_SOLO_YEAR"] as const,
  email: ["RESEND_API_KEY"] as const,
  sms: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"] as const,
  zoom: ["ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET", "ZOOM_WEBHOOK_SECRET", "ZOOM_REDIRECT_URL"] as const,
} as const;

function checkVar(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function main() {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const varName of REQUIRED_VARS) {
    if (!checkVar(varName)) {
      missing.push(varName);
    }
  }

  // Check session secret (at least one required)
  const hasSessionSecret = checkVar("SESSION_SECRET") || checkVar("ENCRYPTION_KEY");
  if (!hasSessionSecret) {
    missing.push("SESSION_SECRET or ENCRYPTION_KEY");
  }

  // Check conditional vars (warn if partial)
  if (checkVar("STRIPE_SECRET_KEY")) {
    for (const varName of CONDITIONAL_VARS.billing) {
      if (!checkVar(varName)) {
        missing.push(varName);
      }
    }
    const hasAnyPrice =
      checkVar("STRIPE_PRICE_ID") ||
      checkVar("STRIPE_SOLO_YEARLY") ||
      checkVar("STRIPE_SOLO_MONTHLY") ||
      checkVar("STRIPE_GROWTH_YEARLY") ||
      checkVar("STRIPE_TEAM_YEARLY") ||
      checkVar("STRIPE_PRICE_SOLO_MONTH") ||
      checkVar("STRIPE_PRICE_SOLO_YEAR") ||
      checkVar("STRIPE_PRICE_GROWTH_MONTH") ||
      checkVar("STRIPE_PRICE_TEAM_MONTH");
    if (!hasAnyPrice) {
      warnings.push("Stripe enabled but no STRIPE_PRICE_ID or STRIPE_PRICE_* / STRIPE_*_YEARLY set");
    }
  }

  if (checkVar("RESEND_API_KEY")) {
    if (!checkVar("EMAIL_FROM")) {
      warnings.push("RESEND_API_KEY set but EMAIL_FROM missing (will use default)");
    }
  }

  if (checkVar("TWILIO_ACCOUNT_SID") || checkVar("TWILIO_AUTH_TOKEN")) {
    for (const varName of CONDITIONAL_VARS.sms) {
      if (!checkVar(varName)) {
        warnings.push(`SMS enabled but ${varName} missing`);
      }
    }
  }

  if (checkVar("ZOOM_CLIENT_ID") || checkVar("ZOOM_CLIENT_SECRET")) {
    for (const varName of CONDITIONAL_VARS.zoom) {
      if (!checkVar(varName)) {
        warnings.push(`Zoom enabled but ${varName} missing`);
      }
    }
  }

  // Output (doctrine-safe: no secret values)
  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((name) => console.error(`  - ${name}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn("Configuration warnings:");
    warnings.forEach((msg) => console.warn(`  - ${msg}`));
  }

  console.log("All required environment variables are set.");
  process.exit(0);
}

main();
