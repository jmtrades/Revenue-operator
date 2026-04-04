/**
 * Retry-with-backoff for transient failures.
 *
 * Wraps any async function with configurable retry logic.
 * Distinguishes retryable (timeout, 503, connection) from
 * non-retryable (400, 401, constraint violation) errors.
 */

import { log } from "@/lib/logger";

interface RetryOptions {
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms (default: 500). Actual delay = base * 2^attempt */
  baseDelayMs?: number;
  /** Max delay cap in ms (default: 5000) */
  maxDelayMs?: number;
  /** Operation label for logging */
  operation?: string;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

/** Default check: retry on timeouts, connection errors, and 5xx */
function defaultIsRetryable(error: unknown): boolean {
  if (!error) return false;

  // Network/connection errors
  if (error instanceof TypeError && error.message.includes("fetch")) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;

  // Error with status code
  const status = (error as { status?: number }).status;
  if (typeof status === "number") {
    // Retry on 429 (rate limit), 502, 503, 504
    return status === 429 || status === 502 || status === 503 || status === 504;
  }

  // Error with code (Node.js errors)
  const code = (error as { code?: string }).code;
  if (typeof code === "string") {
    return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "EAI_AGAIN"].includes(code);
  }

  // Supabase connection errors
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|connection|ECONNRESET|socket hang up|network/i.test(message)) return true;

  return false;
}

/**
 * Execute an async function with retry-on-transient-failure.
 *
 * @example
 * const data = await withRetry(
 *   () => db.from("agents").select("*").eq("workspace_id", wsId),
 *   { operation: "fetch_agents", maxRetries: 2 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 5000,
    operation = "unknown",
    isRetryable = defaultIsRetryable,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryable(error)) {
        break;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      // Add jitter: 0-25% of delay
      const jitter = Math.floor(Math.random() * delay * 0.25);

      log("warn", "db.retry_attempt", {
        operation,
        attempt: attempt + 1,
        max_retries: maxRetries,
        delay_ms: delay + jitter,
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

/**
 * Convenience: retry a Supabase query that may fail transiently.
 * Unwraps the Supabase `{ data, error }` pattern and throws on error.
 */
export async function withDbRetry<T>(
  fn: () => Promise<{ data: T | null; error: { message: string; code?: string } | null }>,
  options: Omit<RetryOptions, "isRetryable"> & { throwOnNull?: boolean } = {},
): Promise<T> {
  const result = await withRetry(async () => {
    const { data, error } = await fn();
    if (error) {
      // Non-retryable constraint violations
      if (error.code === "23505" || error.code === "23503") {
        const constraintError = new Error(error.message) as Error & { code: string; status: number };
        constraintError.code = error.code;
        constraintError.status = 409;
        throw constraintError;
      }
      throw new Error(error.message);
    }
    return data;
  }, options);

  if (result === null && options.throwOnNull) {
    throw new Error(`${options.operation ?? "query"}: no result returned`);
  }

  return result as T;
}
