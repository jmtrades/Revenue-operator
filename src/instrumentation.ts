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
      console.error("[instrumentation] Environment validation failed:", errorMessage);
      if (process.env.NODE_ENV === "production") {
        throw error;
      } else {
        console.warn("[instrumentation] Continuing startup despite missing env vars (degraded mode).");
      }
    }
  }
}
