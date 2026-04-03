/**
 * Safe background task execution.
 *
 * Replaces fire-and-forget `void fn().catch(log)` patterns with
 * structured error handling that ensures failures are visible.
 *
 * Usage:
 *   // Instead of: void sendEmail(to, body).catch((e) => log("warn", e));
 *   backgroundTask("send_dunning_email", () => sendDunningEmail(to, body));
 */

import { log } from "@/lib/logger";

interface BackgroundTaskOptions {
  /** If true, swallow the error after logging (default: true) */
  swallowError?: boolean;
  /** Additional context for structured logging */
  context?: Record<string, unknown>;
}

/**
 * Execute an async function in the background with guaranteed error logging.
 * Never throws — errors are always caught and logged.
 */
export function backgroundTask(
  name: string,
  fn: () => Promise<unknown>,
  options: BackgroundTaskOptions = {},
): void {
  const { swallowError = true, context = {} } = options;

  const start = Date.now();

  fn()
    .then(() => {
      const durationMs = Date.now() - start;
      if (durationMs > 5000) {
        log("warn", "background_task.slow", { task: name, duration_ms: durationMs, ...context });
      }
    })
    .catch((error: unknown) => {
      const durationMs = Date.now() - start;
      log("error", "background_task.failed", {
        task: name,
        duration_ms: durationMs,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split("\n").slice(0, 3).join(" | ") : undefined,
        ...context,
      });

      if (!swallowError) {
        // Re-throw for process-level error handlers (e.g., Sentry)
        throw error;
      }
    });
}

/**
 * Execute multiple background tasks concurrently.
 * All tasks run independently — one failure doesn't block others.
 */
export function backgroundTasks(
  tasks: Array<{ name: string; fn: () => Promise<unknown>; context?: Record<string, unknown> }>,
): void {
  for (const task of tasks) {
    backgroundTask(task.name, task.fn, { context: task.context });
  }
}
