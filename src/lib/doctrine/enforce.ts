/**
 * Doctrine enforcement — when DOCTRINE_ENFORCED=1, legacy paths must convert or fail.
 */

export function isDoctrineEnforced(): boolean {
  return process.env.DOCTRINE_ENFORCED === "1";
}

/**
 * If doctrine is enforced, log violation and throw. Call from legacy entrypoints.
 */
export function assertNotEnforcedOrConvert(
  context: { jobType: string; id?: string; message?: string; detail?: string }
): void {
  if (!isDoctrineEnforced()) return;
  logDoctrineViolation({
    ...context,
    message: "Legacy path invoked while DOCTRINE_ENFORCED=1",
  });
  throw new Error(
    `Doctrine violation: ${context.jobType} must not run when DOCTRINE_ENFORCED=1. Convert to canonical signal or use signal path.`
  );
}

/**
 * Log to doctrine_violations table (non-blocking).
 */
export async function logDoctrineViolation(entry: {
  jobType: string;
  id?: string;
  message: string;
  detail?: string;
}): Promise<void> {
  try {
    const db = (await import("@/lib/db/queries")).getDb();
    await db.from("doctrine_violations").insert({
      job_type: entry.jobType,
      job_id: entry.id ?? null,
      message: entry.message,
      detail: entry.detail ?? null,
    });
  } catch {
    // Violation log failed; non-fatal
  }
}
