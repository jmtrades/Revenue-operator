/**
 * Content-Security-Policy builder used by middleware.ts.
 *
 * Why a shared builder:
 *  - The CSP header needs a per-request nonce so `'strict-dynamic'` can replace
 *    `'unsafe-inline'` for script-src. That requires middleware (not a static
 *    `headers()` entry in next.config.ts) — middleware runs per request and
 *    can mint a fresh nonce.
 *  - Extracting the builder into its own module lets us unit-test the policy
 *    shape (nonce present, strict-dynamic present, media-src tight, etc.)
 *    without booting the framework.
 *
 * Threat model notes:
 *  - script-src: NO `'unsafe-inline'`. `'strict-dynamic'` + `'nonce-<random>'`
 *    means a reflected-XSS payload like `<script>alert(1)</script>` is blocked
 *    because it has no matching nonce. Any <script> Next.js generates with the
 *    per-request nonce is allowed, and CSP3 strict-dynamic lets THOSE scripts
 *    transitively load more scripts — but a hostile inline tag stays dead.
 *  - style-src: still `'unsafe-inline'`. Next.js App Router streams <style>
 *    tags during hydration without per-element nonce support (a known upstream
 *    gap); removing this breaks rendering. The test in csp.test.ts pins this
 *    trade-off so it's rediscovered intentionally, not by accident.
 *  - media-src: tight explicit allowlist. The previous policy allowed `https:`
 *    as a token, which matched every HTTPS origin on the internet for <audio>
 *    / <video> — effectively no origin restriction on call-recording sources.
 */

const SUPABASE = "https://*.supabase.co";
const SUPABASE_WSS = "wss://*.supabase.co";

/**
 * Crypto-random nonce. 128 bits → base64url (~22 chars, URL-safe).
 * Uses the Web Crypto API which is present in both Node 20+ and the Edge
 * runtime that middleware runs under.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64url (no padding) — valid inside a CSP `'nonce-…'` source.
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",

    // API / data plane: Supabase (REST + realtime WS), Stripe JS + API,
    // Telnyx voice, Resend email, Anthropic for on-app LLM calls, and
    // Sentry ingest for client-side error reporting. Wildcards are scoped
    // to known vendor domains — no bare `https:`.
    [
      "connect-src",
      "'self'",
      SUPABASE,
      SUPABASE_WSS,
      "https://api.stripe.com",
      "https://js.stripe.com",
      "https://api.telnyx.com",
      "https://api.resend.com",
      "https://api.anthropic.com",
      "https://*.sentry.io",
      "https://*.ingest.sentry.io",
    ].join(" "),

    // Images: same-origin, inline data (icons), Supabase avatars, Google
    // profile pics (OAuth), jsdelivr (flag SVGs / icon sets).
    [
      "img-src",
      "'self'",
      "data:",
      "blob:",
      SUPABASE,
      "https://cdn.jsdelivr.net",
      "https://lh3.googleusercontent.com",
    ].join(" "),

    // Call recordings + TTS demos: Supabase storage (our recordings), the
    // Twilio and Telnyx media endpoints (third-party recordings we fetch
    // on demand), blob: for MediaRecorder output in the voice studio,
    // data: for test harness fixtures.
    [
      "media-src",
      "'self'",
      "data:",
      "blob:",
      SUPABASE,
      "https://api.twilio.com",
      "https://api.telnyx.com",
    ].join(" "),

    "font-src 'self' data:",
    "worker-src 'self' blob:",

    // App Router streaming inserts <style> tags mid-response without nonce
    // propagation. Until that's fixed upstream, unsafe-inline stays on
    // style-src. See the rationale comment above buildCsp().
    "style-src 'self' 'unsafe-inline'",

    // Stripe checkout redirects into an iframe on https://js.stripe.com
    // for 3DS; keep frame-src scoped to that origin.
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",

    // Scripts: strict-dynamic + per-request nonce. `https:` and `'self'` are
    // ignored when strict-dynamic is present in CSP3 browsers; they remain
    // for CSP2 fallback.
    `script-src 'self' 'strict-dynamic' 'nonce-${nonce}' https:`,

    // Block mixed content (http inside https pages) before it hits the
    // browser.
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}
