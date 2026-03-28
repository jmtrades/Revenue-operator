/**
 * Client error reporting: capture React error boundaries and unhandled rejections,
 * send to POST /api/errors/report (no PII).
 */

export type ErrorCategory = "network" | "auth" | "data" | "unknown";

export function categorizeError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (/network|fetch|failed to load|connection|timeout/i.test(lower)) return "network";
  if (/unauthorized|401|403|auth|session|login/i.test(lower)) return "auth";
  if (/not found|404|500|server error|invalid response/i.test(lower)) return "data";
  return "unknown";
}

export async function reportError(payload: {
  message: string;
  stack?: string | null;
  category?: ErrorCategory;
  pageUrl?: string;
}): Promise<void> {
  try {
    await fetch("/api/errors/report", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: payload.message,
        stack: payload.stack ?? null,
        error_type: payload.category ?? "unknown",
        page_url: typeof window !== "undefined" ? window.location.href : payload.pageUrl ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
    });
  } catch (reportErr) {
    // Log to console as last resort — structured logger may also be broken
    if (typeof console !== "undefined") {
      console.warn("[error-reporting] Failed to report error:", reportErr instanceof Error ? reportErr.message : String(reportErr));
    }
  }
}

function initUnhandledRejection(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("unhandledrejection", (event) => {
    const err = event.reason;
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    reportError({ message, stack, category: categorizeError(err) });
  });
}

let inited = false;
export function initErrorReporting(): void {
  if (inited) return;
  inited = true;
  initUnhandledRejection();
}
