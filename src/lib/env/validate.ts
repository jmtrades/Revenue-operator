/**
 * Environment variable validation.
 * Production requires: DOCTRINE_ENFORCED, CRON_SECRET, SESSION_SECRET (and base required vars).
 * Warns (never crashes build) with exact list of missing variable names.
 */

const REQUIRED_VARS = {
  SUPABASE: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  STRIPE: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  STRIPE_PRICES: ["STRIPE_PRICE_SOLO_MONTH", "STRIPE_PRICE_GROWTH_MONTH", "STRIPE_PRICE_TEAM_MONTH"],
  CRON: ["CRON_SECRET"],
  SESSION: ["SESSION_SECRET"],
  TWILIO: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
} as const;

/** Conditional checks — only warn when the related provider is active */
const CONDITIONAL_VARS: Record<string, { condition: () => boolean; vars: string[] }> = {
  RECALL: {
    condition: () => (process.env.VOICE_PROVIDER ?? "recall") === "recall",
    vars: ["VOICE_SERVER_URL"],
  },
};

/** Required only when NODE_ENV === "production" */
const PRODUCTION_ONLY_VARS = ["DOCTRINE_ENFORCED", "CRON_SECRET", "SESSION_SECRET"] as const;

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const [category, vars] of Object.entries(REQUIRED_VARS)) {
    for (const varName of vars) {
      if (!process.env[varName]) {
        missing.push(`${category}: ${varName}`);
      }
    }
  }

  // Conditional checks — warn-only
  for (const [category, { condition, vars }] of Object.entries(CONDITIONAL_VARS)) {
    if (condition()) {
      for (const varName of vars) {
        if (!process.env[varName]) {
          warnings.push(`${category}: ${varName}`);
        }
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

  // Log warnings for conditional vars (never crash)
  if (warnings.length > 0) {
    console.warn(`[env] Missing optional environment variables (features may be degraded):\n${warnings.map((v) => `  - ${v}`).join("\n")}`);
  }

  // Log missing required vars (warn-only — never crash the build)
  if (missing.length > 0) {
    console.warn(`[env] Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\n\nSet these in your .env.local or production environment.`);
  }
}

// Auto-validate on import (server-side only), never block startup.
if (typeof window === "undefined") {
  try {
    validateEnv();
  } catch (error) {
    console.warn("[env] Validation error (non-blocking):", error);
  }
}
