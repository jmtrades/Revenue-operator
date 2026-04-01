/**
 * Canonical base URL for server (redirects, callbacks) and client (links).
 * Use getBaseUrl() in API routes and server components; getPublicBaseUrl() in client.
 */

const FALLBACK_ORIGIN = "https://www.recall-touch.com";

/**
 * Stale domains that should be corrected to the canonical production URL.
 * Prevents misdirected email links / OAuth callbacks when env vars drift.
 */
const STALE_DOMAINS = new Set(["revenueoperator.ai", "www.revenueoperator.ai"]);

function correctStaleUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (STALE_DOMAINS.has(parsed.hostname)) return FALLBACK_ORIGIN;
    return url.replace(/\/$/, "");
  } catch {
    return FALLBACK_ORIGIN;
  }
}

/**
 * Server-side: BASE_URL or NEXT_PUBLIC_APP_URL or request origin. Deterministic for redirects.
 */
export function getBaseUrl(requestOrigin?: string | null): string {
  const fromEnv = process.env.BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.startsWith("http")) return correctStaleUrl(fromEnv);
  if (requestOrigin && typeof requestOrigin === "string" && requestOrigin.startsWith("http")) return requestOrigin.replace(/\/$/, "");
  return FALLBACK_ORIGIN;
}

/**
 * Client-side: same as getBaseUrl but safe when env may be undefined (build time).
 * Prefer NEXT_PUBLIC_APP_URL for client links so it is set at build.
 */
export function getPublicBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BASE_URL;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.startsWith("http")) return fromEnv.replace(/\/$/, "");
  return FALLBACK_ORIGIN;
}
