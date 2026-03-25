const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SESSION_SECRET",
  "VOICE_SERVER_URL",

  // Telnyx primary provider
  "TELNYX_API_KEY",
  "TELNYX_CONNECTION_ID",
  "TELNYX_MESSAGING_PROFILE_ID",
  "TELNYX_PUBLIC_KEY",

  // Runtime selection
  "TELEPHONY_PROVIDER",

  // Cron auth / anti-spoofing
  "CRON_SECRET",
] as const;

const OPTIONAL_TWILIO_VARS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
] as const;

const ALLOWED_TELEPHONY_PROVIDERS = ["telnyx", "twilio"] as const;

export function validateEnv(): void {
  const missingRequired = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missingRequired.length > 0) {
    console.error(
      `\n❌ Missing required environment variables:\n${missingRequired
        .map((k) => `   - ${k}`)
        .join("\n")}\n`,
    );
    // Warn only — do NOT throw. Throwing here crashes `next build` during
    // page-data collection when runtime-only env vars are unavailable.
    // The real runtime check lives in instrumentation.ts → @/lib/env/validate.
  }

  const provider = (process.env.TELEPHONY_PROVIDER ?? "").toLowerCase();
  if (provider && !ALLOWED_TELEPHONY_PROVIDERS.includes(provider as (typeof ALLOWED_TELEPHONY_PROVIDERS)[number])) {
    console.error(
      `\n❌ TELEPHONY_PROVIDER must be one of: ${ALLOWED_TELEPHONY_PROVIDERS.join(
        ", ",
      )}. Got: ${provider || "(empty)"}`,
    );
  }

  // Twilio is a legacy fallback. Don't error if it's missing — but surface it.
  const missingTwilio = OPTIONAL_TWILIO_VARS.filter((key) => !process.env[key]);
  if (missingTwilio.length > 0) {
    if (provider === "twilio") {
      console.warn(
        `\n⚠️ TELEPHONY_PROVIDER=twilio but missing legacy Twilio env vars:\n${missingTwilio
          .map((k) => `   - ${k}`)
          .join("\n")}\n`,
      );
    } else {
      console.warn(
        `\n⚠️ Optional Twilio legacy env vars missing (expected since Telnyx is primary):\n${missingTwilio
          .map((k) => `   - ${k}`)
          .join("\n")}\n`,
      );
    }
  }
}
