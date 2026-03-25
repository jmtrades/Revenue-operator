/**
 * Comprehensive retry logic for API calls
 * Exponential backoff with jitter
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED"],
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: string }).code;

      // Don't retry on final attempt
      if (attempt === opts.maxAttempts - 1) {
        throw error;
      }

      // Don't retry if error is not retryable
      if (opts.retryableErrors.length > 0) {
        const isRetryable = opts.retryableErrors.some(
          (retryable) => errorMessage.includes(retryable) || errorCode === retryable
        );
        if (!isRetryable) {
          throw error;
        }
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        opts.maxDelayMs
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
