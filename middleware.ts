import { NextRequest, NextResponse } from "next/server";
import { buildCsp, generateNonce } from "@/lib/security/csp";

const LOCALES = new Set(["en", "es", "fr", "de", "pt", "ja"]);
const LOCALE_COOKIE = "rt_locale";

/**
 * Generate or reuse an X-Request-ID per request. Upstream proxies (CDN, LB)
 * commonly attach one; we only mint a new UUID when the caller hasn't. This
 * lets every log line, every API response, and every voice-server hop share a
 * single correlation ID so an operator can grep a whole request end-to-end.
 *
 * Format is a loose UUIDv4; length-capped and whitelist-filtered so a hostile
 * client can't poison our logs with a 5 KB request-ID.
 */
const REQUEST_ID_MAX = 128;
const REQUEST_ID_SAFE = /^[a-zA-Z0-9_\-:.]{1,128}$/;
function deriveRequestId(req: NextRequest): string {
  const upstream = req.headers.get("x-request-id");
  if (upstream && upstream.length <= REQUEST_ID_MAX && REQUEST_ID_SAFE.test(upstream)) {
    return upstream;
  }
  // crypto.randomUUID is available in the Edge runtime since Next 13.
  return crypto.randomUUID();
}

/**
 * Middleware:
 *  1. Inject X-Request-ID onto both request (for handlers/logs) and response
 *     (for callers to echo back in bug reports).
 *  2. Forward the full URL as x-url so server components can read query params.
 *  3. Persist ?locale= to a cookie for multi-lingual sessions.
 */
export function middleware(req: NextRequest) {
  const requestId = deriveRequestId(req);

  // Per-request CSP nonce. Must be generated here (not in next.config.ts
  // `headers()`) so a fresh value lands on every response. Next.js reads
  // the nonce off the request CSP header and stamps it onto the inline
  // scripts it emits for streaming and hydration.
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Clone request headers so downstream handlers see x-request-id and
  // server components can read the nonce via the `x-nonce` header if they
  // need to emit their own <script nonce>.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-url", req.nextUrl.toString());
  requestHeaders.set("x-nonce", nonce);
  // Next.js convention: setting the CSP header on the *request* makes the
  // framework treat it as the active policy and propagate the nonce to
  // framework-generated scripts.
  requestHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // Echo the request id back so clients / uptime monitors can capture it.
  res.headers.set("x-request-id", requestId);
  res.headers.set("x-url", req.nextUrl.toString());
  // And the CSP on the response itself so the browser enforces it.
  res.headers.set("content-security-policy", csp);

  // If ?locale= is in the URL, persist it as a cookie for future page loads
  const localeParam = req.nextUrl.searchParams.get("locale");
  if (localeParam && LOCALES.has(localeParam)) {
    res.cookies.set(LOCALE_COOKIE, localeParam, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}

export const config = {
  // Run on every request so request-ID propagation is universal. Static assets
  // (_next, favicon, sitemap, etc.) are excluded since they don't benefit from
  // per-request correlation and would just add cold-start overhead.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|manifest.json|robots.txt|sitemap.xml).*)",
  ],
};
