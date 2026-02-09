/**
 * Env validation at boot (server-side).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { getEnv } = await import("@/lib/env");
      getEnv();
    } catch {
      // Allow build without full env
    }
  }
}
