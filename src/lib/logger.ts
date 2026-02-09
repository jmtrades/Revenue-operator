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
  else console.log(line);
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
