/**
 * Client-side JSON fetch with exponential backoff + jitter for 429 / 5xx.
 * Avoids hammering APIs when rate-limited.
 */

function jitterMs(base: number): number {
  const j = Math.floor(Math.random() * Math.min(400, Math.max(50, base * 0.25)));
  return base + j;
}

function parseRetryAfterMs(res: Response): number {
  const h = res.headers.get("Retry-After");
  if (!h) return 0;
  const asInt = parseInt(h, 10);
  if (Number.isFinite(asInt) && asInt >= 0) return asInt * 1000;
  const asDate = Date.parse(h);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  return 0;
}

export type BackoffJsonResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; message: string; retryAfterMs?: number };

/**
 * @param maxAttempts - total tries (including first request)
 */
export async function fetchJsonWithBackoff<T = unknown>(
  url: string,
  init: RequestInit & { maxAttempts?: number } = {},
): Promise<BackoffJsonResult<T>> {
  const maxAttempts = Math.max(1, init.maxAttempts ?? 4);
  const { maxAttempts: _omit, ...rest } = init;
  let lastStatus = 0;
  let lastMessage = "";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, { credentials: "include", ...rest });
    lastStatus = res.status;

    if (res.ok) {
      const data = (await res.json()) as T;
      return { ok: true, data, status: res.status };
    }

    const bodyText = await res.text().catch(() => "");
    lastMessage = bodyText || res.statusText;

    if (res.status === 401 || res.status === 403 || res.status === 404) {
      return { ok: false, status: res.status, message: lastMessage };
    }

    const fromHeader = parseRetryAfterMs(res);
    const backoff =
      fromHeader > 0
        ? fromHeader
        : res.status === 429 || res.status >= 500
          ? jitterMs(Math.min(30_000, 800 * 2 ** attempt))
          : 0;

    if (res.status !== 429 && res.status < 500) {
      return { ok: false, status: res.status, message: lastMessage };
    }

    if (attempt < maxAttempts - 1 && backoff > 0) {
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  return {
    ok: false,
    status: lastStatus,
    message: lastMessage || "Request failed after retries",
  };
}
