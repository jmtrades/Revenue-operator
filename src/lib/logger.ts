/**
 * Structured logging with request_id and job_id.
 * Redacts secrets automatically.
 */

import { redact } from "@/lib/redact";

export function log(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta && redact(meta)),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function withContext(requestId?: string, jobId?: string) {
  return {
    info: (msg: string, meta?: Record<string, unknown>) =>
      log("info", msg, { request_id: requestId, job_id: jobId, ...meta }),
    warn: (msg: string, meta?: Record<string, unknown>) =>
      log("warn", msg, { request_id: requestId, job_id: jobId, ...meta }),
    error: (msg: string, meta?: Record<string, unknown>) =>
      log("error", msg, { request_id: requestId, job_id: jobId, ...meta }),
  };
}

/**
 * Read the per-request X-Request-ID injected by middleware. Returns null
 * outside a request scope (e.g., background jobs, CLI). API route handlers
 * can call this to get a correlation id without threading it through every
 * function signature.
 *
 * Usage inside a route handler:
 *   import { getRequestId } from "@/lib/logger";
 *   const rid = await getRequestId();
 */
export async function getRequestId(): Promise<string | null> {
  try {
    // Dynamic import so this module stays usable outside App Router contexts
    // (e.g., scripts, tests). `headers()` throws if called outside a request.
    const { headers } = await import("next/headers");
    const h = await headers();
    return h.get("x-request-id");
  } catch {
    return null;
  }
}

/**
 * Request-scoped logger that auto-attaches `request_id` (from the current
 * `next/headers` context) to every log line. Call inside an App Router
 * handler so operators can grep by a single id end-to-end.
 *
 * Usage:
 *   const log = await requestLogger({ job_id: "…" });
 *   log.info("started", { step: "validate" });
 *
 * Outside a request scope, request_id is simply omitted — the returned
 * object is still safe to call.
 */
export async function requestLogger(baseMeta?: { job_id?: string } & Record<string, unknown>) {
  const requestId = await getRequestId();
  return withContext(requestId ?? undefined, baseMeta?.job_id);
}
