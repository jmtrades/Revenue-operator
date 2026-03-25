/**
 * Unified cron runner: overlap protection, error handling, timeout, structured result.
 * All cron routes should call runSafeCron with their job name and handler.
 */

export interface SafeCronResult {
  ok: boolean;
  jobs_run: number;
  failures: number;
  error?: string;
  details?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT_MS = 55_000; // leave margin for 60s serverless

export async function runSafeCron(
  jobName: string,
  handler: () => Promise<{ run: number; failures?: number; [k: string]: unknown }>,
  options?: { timeoutMs?: number }
): Promise<SafeCronResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let run = 0;
  let failures = 0;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Cron timeout")), timeoutMs);
  });

  try {
    const result = await Promise.race([
      handler(),
      timeoutPromise,
    ]);
    run = result.run ?? 0;
    failures = result.failures ?? 0;
    const ok = failures === 0;
    if (ok) {
      const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
      await recordCronHeartbeat(jobName).catch(() => {});
    }
    return {
      ok,
      jobs_run: run,
      failures,
      details: result,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      jobs_run: run,
      failures: failures + 1,
      error,
    };
  }
}
