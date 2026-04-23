/**
 * Production logging - server-side only.
 * Silent logs for failures, retries, queue delays, session restore events.
 * Never surfaces to UI.
 */

import { log } from "@/lib/logger";

export function logApiFailure(endpoint: string, error: unknown, workspaceId?: string): void {
  if (typeof window !== "undefined") return; // Server-side only
  log("error", "[reliability] API failure", {
    endpoint,
    workspace_id: workspaceId,
    error: error instanceof Error ? error.message : String(error),
  });
}

export function logWebhookFailure(webhookType: string, error: unknown, workspaceId?: string): void {
  if (typeof window !== "undefined") return;
  log("error", "[reliability] Webhook failure", {
    webhook_type: webhookType,
    workspace_id: workspaceId,
    error: error instanceof Error ? error.message : String(error),
  });
}

export function logRetry(endpoint: string, attempt: number, workspaceId?: string): void {
  if (typeof window !== "undefined") return;
  if (process.env.NODE_ENV === "production") return;
  log("warn", "[reliability] Retry", {
    endpoint,
    attempt,
    workspace_id: workspaceId,
  });
}

export function logQueueDelay(jobType: string, delayMs: number, workspaceId?: string): void {
  if (typeof window !== "undefined") return;
  if (process.env.NODE_ENV === "production") return;
  if (delayMs > 30_000) {
    log("warn", "[reliability] Queue delay exceeded threshold", {
      job_type: jobType,
      delay_ms: delayMs,
      workspace_id: workspaceId,
    });
  }
}

export function logSessionRestore(userId: string, workspaceId: string): void {
  // Server-side only - but allow client-side calls (they just won't log)
  if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
    log("info", "[reliability] Session restore", {
      user_id: userId,
      workspace_id: workspaceId,
    });
  }
}
