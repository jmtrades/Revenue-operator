/**
 * Env validation at boot (server-side).
 * Enforces validation in production, warns in dev.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/continuity-connectors/register");
    try {
      const { validateEnv } = await import("@/lib/env/validate");
      validateEnv();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Always log the error
      console.error("[instrumentation] Environment validation failed:", errorMessage);
      // Never block startup based on env; log and continue in a degraded mode.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[instrumentation] Continuing startup despite missing env vars (degraded mode).");
      }
    }
  }
}
