/**
 * Env validation at boot (server-side).
 * Enforces validation in production, warns in dev.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { validateEnv } = await import("@/lib/env/validate");
      validateEnv();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Always log the error
      console.error("[instrumentation] Environment validation failed:", errorMessage);
      
      // In production, throw to prevent startup with missing vars
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Production startup blocked: ${errorMessage}`);
      }
      
      // In dev, warn but allow startup (for local development flexibility)
      console.warn("[instrumentation] Continuing in dev mode despite missing env vars");
    }
  }
}
