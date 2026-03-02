/**
 * Environment variable validation.
 * Production requires: DOCTRINE_ENFORCED, CRON_SECRET, SESSION_SECRET (and base required vars).
 * Throws with exact list of missing variable names.
 */

const REQUIRED_VARS = {
  SUPABASE: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  STRIPE: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"],
  CRON: ["CRON_SECRET"],
  SESSION: ["SESSION_SECRET"],
  TWILIO: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
} as const;

/** Required only when NODE_ENV === "production" */
const PRODUCTION_ONLY_VARS = ["DOCTRINE_ENFORCED", "CRON_SECRET", "SESSION_SECRET"] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const [category, vars] of Object.entries(REQUIRED_VARS)) {
    for (const varName of vars) {
      if (!process.env[varName]) {
        missing.push(`${category}: ${varName}`);
      }
    }
  }

  if (process.env.NODE_ENV === "production") {
    for (const varName of PRODUCTION_ONLY_VARS) {
      if (!process.env[varName]) {
        if (!missing.some((m) => m.endsWith(`: ${varName}`))) {
          missing.push(`PRODUCTION: ${varName}`);
        }
      }
    }
  }

  if (missing.length > 0) {
    const error = `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\n\nSet these in your .env.local or production environment.`;
    throw new Error(error);
  }
}

// Auto-validate on import (server-side only), but never block startup.
if (typeof window === "undefined") {
  try {
    validateEnv();
  } catch (error) {
    console.warn("[env] Missing environment variables (non-blocking):", error);
  }
}
