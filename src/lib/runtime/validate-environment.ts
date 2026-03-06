/**
 * Server startup environment validation.
 * Required vars: missing → throw and stop. Optional: missing → log structured warning once.
 * Use NEXT_PUBLIC_APP_URL for app/base URL (Vercel); APP_URL is optional legacy.
 */

const REQUIRED = [
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
] as const;

const OPTIONAL_STRIPE = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_DEFAULT_PRICE_ID",
] as const;

const OPTIONAL_EMAIL = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

let validated = false;

function isSettlementEnabled(): boolean {
  return process.env.ECONOMIC_SETTLEMENT_ENABLED === "true" || !!process.env.STRIPE_SECRET_KEY;
}

export function validateEnvironment(): void {
  if (validated) return;
  if (process.env.NODE_ENV === "test") {
    validated = true;
    return;
  }
  validated = true;

  const missingRequired: string[] = [];
  for (const key of REQUIRED) {
    const v = process.env[key];
    if (v === undefined || v === "") missingRequired.push(key);
  }
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingRequired.join(", ")}. Server cannot start.`
    );
  }

  if (isSettlementEnabled()) {
    const missingStripe: string[] = [];
    for (const key of OPTIONAL_STRIPE) {
      const v = process.env[key];
      if (v === undefined || v === "") missingStripe.push(key);
    }
    if (missingStripe.length > 0) {
      logStructured("warning", "optional_stripe_missing", {
        message: "Stripe/settlement enabled but keys missing",
        missing: missingStripe,
      });
    }
  }

  const missingEmail: string[] = [];
  for (const key of OPTIONAL_EMAIL) {
    const v = process.env[key];
    if (v === undefined || v === "") missingEmail.push(key);
  }
  if (missingEmail.length > 0) {
    logStructured("warning", "optional_email_missing", {
      message: "Email delivery may be unavailable",
      missing: missingEmail,
    });
  }
}

function logStructured(level: string, event: string, data: Record<string, unknown>): void {
  if (typeof window !== "undefined") return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  });
  if (level === "warning") {
     
    console.warn(line);
  } else {
     
    console.log(line);
  }
}
