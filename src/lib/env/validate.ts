/**
 * Environment variable validation.
 * Production requires: DOCTRINE_ENFORCED, CRON_SECRET, SESSION_SECRET (and base required vars).
 * Warns (never crashes build) with exact list of missing variable names.
 */

const REQUIRED_VARS = {
  SUPABASE: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  CRON: ["CRON_SECRET"],
  SESSION: ["SESSION_SECRET"],
} as const;

/** These vars are important but should only warn, never block startup */
const OPTIONAL_VARS = {
  STRIPE: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  STRIPE_PRICES: ["STRIPE_PRICE_SOLO_MONTH", "STRIPE_PRICE_BUSINESS_MONTH", "STRIPE_PRICE_SCALE_MONTH"],
  TWILIO_LEGACY: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
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

let _validated = false;

export function validateEnv() {
  // Only log once per serverless instance to avoid noisy production logs
  if (_validated) return;
  _validated = true;

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const [category, vars] of Object.entries(REQUIRED_VARS)) {
    for (const varName of vars) {
      if (!process.env[varName]) {
        missing.push(`${category}: ${varName}`);
      }
    }
  }

  // Optional vars — warn only, never block
  for (const [category, vars] of Object.entries(OPTIONAL_VARS)) {
    for (const varName of vars) {
      if (!process.env[varName]) {
        warnings.push(`${category}: ${varName}`);
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

  // Log warnings for optional/conditional vars (never crash)
  if (warnings.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(`[env] Missing optional environment variables (features may be degraded):\n${warnings.map((v) => `  - ${v}`).join("\n")}`);
  }

  // Log missing required vars (warn-only — never crash the build)
  // In production, validate-environment.ts handles hard failures; suppress noise here.
  if (missing.length > 0 && process.env.NODE_ENV !== "production") {
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
