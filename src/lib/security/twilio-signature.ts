/**
 * Always-on Twilio webhook signature verification.
 *
 * Defense model
 * -------------
 * - `TWILIO_AUTH_TOKEN` MUST be set in every environment that serves a Twilio
 *   webhook. A missing token is a deploy-time error, not a runtime fallback.
 *   This module throws `TwilioSignatureConfigError` on a missing token so the
 *   handler returns 500 (loud) rather than silently accepting (fail-open).
 *
 * - Signature verification runs in ALL environments — there is no `NODE_ENV`
 *   gate. Twilio only posts signed requests; a missing or invalid signature
 *   means either a misconfiguration or an attacker, both of which should get
 *   a 403.
 *
 * - The underlying HMAC-SHA1 comparison delegates to the shared
 *   `verifyTwilioSignature` primitive in `webhook-signature.ts`, which uses
 *   `crypto.timingSafeEqual`.
 *
 * URL variants
 * ------------
 * Twilio signs with the exact URL string it was configured with. Reverse
 * proxies, load balancers, and trailing-slash differences can cause the URL
 * the handler sees (`req.url`) to diverge from what Twilio signed. The
 * `buildTwilioCandidateUrls` helper returns the conservative list of variants
 * worth trying — `verifyTwilioRequest` accepts if ANY variant matches.
 *
 * Phase 78 / Phase 4 (P0-3, P0-4): removes the `NODE_ENV === "production"`
 * guard present in every prior per-route implementation. Non-prod deploys
 * (preview, staging) were previously fail-open.
 */

import type { NextRequest } from "next/server";
import { verifyTwilioSignature } from "./webhook-signature";

export class TwilioSignatureConfigError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "TwilioSignatureConfigError";
  }
}

function getToken(): string {
  const t = process.env.TWILIO_AUTH_TOKEN;
  if (!t) {
    throw new TwilioSignatureConfigError(
      "TWILIO_AUTH_TOKEN is unset. Twilio webhook signature verification cannot be skipped."
    );
  }
  return t;
}

function paramsToObject(
  params: URLSearchParams | Record<string, string> | FormData
): Record<string, string> {
  if (params instanceof URLSearchParams) {
    const obj: Record<string, string> = {};
    for (const [k, v] of params) obj[k] = v;
    return obj;
  }
  if (typeof FormData !== "undefined" && params instanceof FormData) {
    const obj: Record<string, string> = {};
    for (const [k, v] of params.entries()) {
      if (typeof v === "string") obj[k] = v;
    }
    return obj;
  }
  return { ...(params as Record<string, string>) };
}

/**
 * Verify a Twilio webhook request.
 *
 * @param url        a candidate URL OR a list of candidate URLs; the signature
 *                   is accepted if it matches against any URL in the list.
 * @param params     form-encoded params (URLSearchParams, plain object, FormData)
 * @param signature  value of the `x-twilio-signature` header
 * @returns          `true` iff the signature matches against any candidate URL
 * @throws           `TwilioSignatureConfigError` when `TWILIO_AUTH_TOKEN` is unset
 */
export function verifyTwilioRequest(
  url: string | string[],
  params: URLSearchParams | Record<string, string> | FormData,
  signature: string | null
): boolean {
  const token = getToken();
  if (!signature) return false;
  const flat = paramsToObject(params);
  const urls = Array.isArray(url) ? url : [url];
  for (const u of urls) {
    if (verifyTwilioSignature(u, flat, null, signature, token)) return true;
  }
  return false;
}

/**
 * Compose the conservative list of URLs to try when verifying a Twilio
 * webhook. Includes:
 *   1. The URL as this handler received it (`req.url`).
 *   2. The URL rebuilt from `NEXT_PUBLIC_APP_URL` + the request path/query —
 *      catches proxies that rewrite the host on the way in.
 *   3. A trailing-slash variant of (2).
 *   4. A `www.`-stripped variant of (2), for apex/subdomain rewrites.
 *
 * Duplicates are deduped. Never returns an empty list.
 */
export function buildTwilioCandidateUrls(req: NextRequest | Request): string[] {
  const incoming = new URL(req.url);
  const pathAndQuery = `${incoming.pathname}${incoming.search}`;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const urls = new Set<string>();

  // (1) The URL as received.
  urls.add(incoming.toString());

  if (configured) {
    // (2) Configured host + incoming path/query.
    urls.add(`${configured}${pathAndQuery}`);

    // (3) Trailing-slash variant — Twilio sometimes signs with a trailing /.
    if (!incoming.pathname.endsWith("/")) {
      urls.add(
        `${configured}${incoming.pathname}/${incoming.search}`
      );
    }

    // (4) www-stripped variant of the configured host.
    if (configured.startsWith("https://www.")) {
      urls.add(
        `${configured.replace("https://www.", "https://")}${pathAndQuery}`
      );
    } else if (configured.startsWith("http://www.")) {
      urls.add(
        `${configured.replace("http://www.", "http://")}${pathAndQuery}`
      );
    }
  }

  return Array.from(urls);
}
