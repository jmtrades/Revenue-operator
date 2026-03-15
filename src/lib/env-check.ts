const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VAPI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "SESSION_SECRET",
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `\n❌ Missing required environment variables:\n${missing.map((k) => `   - ${k}`).join("\n")}\n`,
    );
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
  }
}
