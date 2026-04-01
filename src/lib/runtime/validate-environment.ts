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

const REQUIRED_TELEPHONY = [
  "TELNYX_API_KEY",
  "TELNYX_CONNECTION_ID",
  "TELNYX_MESSAGING_PROFILE_ID",
  "TELNYX_PUBLIC_KEY",
] as const;

const OPTIONAL_TELEPHONY_LEGACY = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
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

  // Telephony: Telnyx is required when TELEPHONY_PROVIDER is "telnyx" (default)
  const provider = process.env.TELEPHONY_PROVIDER || "telnyx";
  if (provider === "telnyx") {
    const missingTelnyx: string[] = [];
    for (const key of REQUIRED_TELEPHONY) {
      const v = process.env[key];
      if (v === undefined || v === "") missingTelnyx.push(key);
    }
    if (missingTelnyx.length > 0) {
      const msg = `Telnyx is primary telephony provider but keys missing: ${missingTelnyx.join(", ")}. Calls and SMS will fail.`;
      if (process.env.NODE_ENV === "production") {
        throw new Error(msg);
      }
      logStructured("warning", "telephony_telnyx_missing", {
        message: msg,
        missing: missingTelnyx,
      });
    }
  }

  // Legacy Twilio: warn if configured but not primary
  if (provider !== "twilio") {
    const hasTwilio = OPTIONAL_TELEPHONY_LEGACY.every(
      (key) => process.env[key] !== undefined && process.env[key] !== ""
    );
    if (!hasTwilio) {
      logStructured("info", "telephony_twilio_not_configured", {
        message: "Twilio credentials not set — Telnyx is primary, this is expected",
      });
    }
  }

  if (isSettlementEnabled()) {
    const missingStripe: string[] = [];
    for (const key of OPTIONAL_STRIPE) {
      const v = process.env[key];
      if (v === undefined || v === "") missingStripe.push(key);
    }
    if (missingStripe.length > 0) {
      const msg = `Stripe/settlement enabled but keys missing: ${missingStripe.join(", ")}`;
      // Only warn in non-production; logStructured already suppresses in production
      if (process.env.NODE_ENV !== "production") {
        console.warn(msg);
      }
      logStructured("warning", "optional_stripe_missing", {
        message: msg,
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
  if (process.env.NODE_ENV === "production") return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  });
  if (level === "warning") {
    console.warn(line);
  } else {
    console.error(line);
  }
}
