/**
 * Production logging - server-side only.
 * Silent logs for failures, retries, queue delays, session restore events.
 * Never surfaces to UI.
 */

export function logApiFailure(endpoint: string, error: unknown, workspaceId?: string): void {
  if (typeof window !== "undefined") return; // Server-side only
  console.error("[api-failure]", {
    endpoint,
    workspaceId,
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  });
}

export function logWebhookFailure(webhookType: string, error: unknown, workspaceId?: string): void {
  if (typeof window !== "undefined") return;
  console.error("[webhook-failure]", {
    webhookType,
    workspaceId,
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  });
}

export function logRetry(endpoint: string, attempt: number, workspaceId?: string): void {
  if (typeof window !== "undefined") return;
  console.log("[retry]", {
    endpoint,
    attempt,
    workspaceId,
    timestamp: new Date().toISOString(),
  });
}

export function logQueueDelay(jobType: string, delayMs: number, workspaceId?: string): void {
  if (typeof window !== "undefined") return;
  if (delayMs > 30_000) {
    console.warn("[queue-delay]", {
      jobType,
      delayMs,
      workspaceId,
      timestamp: new Date().toISOString(),
    });
  }
}

export function logSessionRestore(userId: string, workspaceId: string): void {
  // Server-side only - but allow client-side calls (they just won't log)
  if (typeof window === "undefined") {
    console.log("[session-restore]", {
      userId,
      workspaceId,
      timestamp: new Date().toISOString(),
    });
  }
}
