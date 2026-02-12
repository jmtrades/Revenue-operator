/**
 * Environment variable validation
 * Throws clear errors on missing required vars
 */

const REQUIRED_VARS = {
  SUPABASE: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  STRIPE: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"],
  CRON: ["CRON_SECRET"],
  SESSION: ["SESSION_SECRET"],
  TWILIO: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
} as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const [category, vars] of Object.entries(REQUIRED_VARS)) {
    for (const varName of vars) {
      if (!process.env[varName]) {
        missing.push(`${category}: ${varName}`);
      }
    }
  }

  if (missing.length > 0) {
    const error = `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\n\nSet these in your .env.local or production environment.`;
    throw new Error(error);
  }
}

// Auto-validate on import (server-side only)
if (typeof window === "undefined") {
  try {
    validateEnv();
  } catch (error) {
    // Only throw in production or if explicitly enabled
    if (process.env.NODE_ENV === "production" || process.env.ENFORCE_ENV_VALIDATION === "true") {
      throw error;
    }
    // In dev, just warn
    console.warn("[env] Missing environment variables (non-blocking in dev):", error);
  }
}
