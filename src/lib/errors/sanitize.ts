/**
 * Sanitize error messages before returning them to clients.
 * Strips internal system details (database errors, provider names, stack traces)
 * and returns user-friendly messages.
 */

const PROVIDER_PATTERNS = [
  /supabase/gi,
  /postgres(?:ql)?/gi,
  /twilio/gi,
  /telnyx/gi,
  /stripe/gi,
  /resend/gi,
  /deepgram/gi,
  /elevenlabs/gi,
  /pipecat/gi,
  /vapi/gi,
  /sentry/gi,
  /posthog/gi,
  /upstash/gi,
  /redis/gi,
  /vercel/gi,
  /anthropic/gi,
  /openai/gi,
  /fly\.io/gi,
];

const DB_PATTERNS = [
  /relation "[\w.]+" does not exist/gi,
  /column "[\w.]+" (?:does not exist|of relation)/gi,
  /duplicate key value violates unique constraint/gi,
  /violates (?:foreign key|check|not-null) constraint/gi,
  /syntax error at or near/gi,
  /ERROR:\s+\d+/g,
  /PGRST\d+/g,
  /permission denied for (?:table|schema|relation)/gi,
  /could not connect to server/gi,
  /connection refused/gi,
  /timeout expired/gi,
  /FATAL:/gi,
];

/** Known safe error messages that can pass through */
const SAFE_MESSAGES = new Set([
  "Unauthorized",
  "Not found",
  "Forbidden",
  "Invalid request",
  "workspace_id required",
  "Phone number and code required",
  "Valid phone number required",
  "Lead not found",
  "Agent not found",
  "Workspace not found",
  "No agent configured for workspace",
]);

/**
 * Returns a sanitized error message safe for client consumption.
 * Sensitive details (database errors, provider names, stack traces) are stripped.
 */
export function sanitizeError(error: unknown, fallback = "An unexpected error occurred. Please try again."): string {
  if (!error) return fallback;

  const message = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : typeof (error as { message?: string }).message === "string"
        ? (error as { message: string }).message
        : fallback;

  // Allow known safe messages through
  if (SAFE_MESSAGES.has(message)) return message;

  // Check for database error patterns
  for (const pattern of DB_PATTERNS) {
    if (pattern.test(message)) return fallback;
    pattern.lastIndex = 0; // Reset regex state
  }

  // Check for provider name leaks
  for (const pattern of PROVIDER_PATTERNS) {
    if (pattern.test(message)) return fallback;
    pattern.lastIndex = 0;
  }

  // Check for stack traces
  if (message.includes("\n    at ") || message.includes("Error:") || message.length > 300) {
    return fallback;
  }

  return message;
}

/**
 * Wraps an error for API response: logs the real error server-side,
 * returns a sanitized version for the client.
 */
export function apiError(
  error: unknown,
  context?: string,
  fallback?: string
): { sanitized: string; raw: string } {
  const raw = error instanceof Error ? error.message : String(error);
  const sanitized = sanitizeError(error, fallback);

  // Server-side logging (import logger lazily to avoid circular deps)
  if (typeof process !== "undefined" && process.env) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { log } = require("@/lib/logger") as { log: (level: string, event: string, data: Record<string, unknown>) => void };
      log("error", context ?? "api_error", { raw_error: raw, sanitized });
    } catch {
      // logger not available, fall through
    }
  }

  return { sanitized, raw };
}
