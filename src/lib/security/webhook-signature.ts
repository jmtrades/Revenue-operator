/**
 * Webhook signature verification — provider-aware.
 *
 * Every vendor has a different signing scheme. This module provides a safe,
 * timing-attack-resistant verifier for each, plus a generic HMAC-SHA256
 * helper for providers that use that scheme directly (Bandwidth, Telnyx,
 * internal-to-internal).
 *
 * References:
 *   - Twilio:   https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *   - Stripe:   https://docs.stripe.com/webhooks/signatures
 *   - Resend:   https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
 *   - Svix:     https://docs.svix.com/receiving/verifying-payloads/how (Resend uses Svix under the hood)
 */

import { createHmac, timingSafeEqual } from "crypto";

const TOLERANCE_SEC = 300;

/** Compare two hex strings in constant time. Returns false on length mismatch. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Compare two base64 strings in constant time. */
function timingSafeEqualBase64(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "base64"), Buffer.from(b, "base64"));
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic HMAC-SHA256 (Bandwidth, Telnyx, internal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic HMAC-SHA256 verification. Signature is hex-encoded.
 * @param payload   raw request body
 * @param signature hex-encoded signature from request header
 * @param secret    shared secret
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  return timingSafeEqualHex(expected, signature);
}

/** Timestamp freshness check — defaults to 5 min tolerance (same as Stripe). */
export function isTimestampFresh(timestampMs: number, toleranceSec = TOLERANCE_SEC): boolean {
  const now = Math.floor(Date.now() / 1000);
  const ts = Math.floor(timestampMs / 1000);
  return Math.abs(now - ts) <= toleranceSec;
}

export function makeNonce(payload: string, timestamp: number): string {
  return createHmac("sha256", "nonce").update(`${payload}:${timestamp}`).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// Twilio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a Twilio webhook signature.
 *
 * Twilio signs:  HMAC-SHA1(url + concat(sorted(k+v for k,v in params)), authToken)
 * The signature is base64. For raw JSON bodies (newer webhooks), Twilio also
 * allows signing the raw body — we support both.
 *
 * @param url        the full request URL exactly as Twilio posted it (scheme + host + path + query)
 * @param params     form-encoded params (undefined for raw JSON bodies)
 * @param rawBody    raw request body string (used when params is undefined)
 * @param signature  value of X-Twilio-Signature header
 * @param authToken  Twilio account auth token
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string> | undefined,
  rawBody: string | null,
  signature: string | null,
  authToken: string,
): boolean {
  if (!signature || !authToken || !url) return false;

  // Form-encoded: canonical data = url + sorted(key + value, ...)
  if (params && Object.keys(params).length > 0) {
    const sortedKeys = Object.keys(params).sort();
    const data = sortedKeys.reduce((acc, key) => acc + key + params[key], url);
    const expected = createHmac("sha1", authToken).update(data).digest("base64");
    return timingSafeEqualBase64(expected, signature);
  }

  // Raw JSON body (Events API / Messaging v1 webhooks): canonical data = url + rawBody
  if (rawBody !== null) {
    const expected = createHmac("sha1", authToken).update(url + rawBody).digest("base64");
    return timingSafeEqualBase64(expected, signature);
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a Stripe webhook signature.
 *
 * Stripe sends:  Stripe-Signature: t=1492774577,v1=5257a869e7...[,v0=...]
 * Signed payload = `${t}.${body}`, HMAC-SHA256 with the endpoint secret,
 * hex-encoded. Tolerance window defaults to 5 minutes.
 *
 * @param rawBody     raw request body string (exactly as received — do NOT re-serialize)
 * @param signature   value of Stripe-Signature header
 * @param secret      webhook endpoint secret (whsec_...)
 * @param toleranceSec max age of timestamp; default 300s (5 min)
 * @param nowSec      injectable for tests
 */
export function verifyStripeSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
  toleranceSec = TOLERANCE_SEC,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!signature || !secret) return false;

  // Parse t=... and v1=... (may have multiple v1 entries, very rare)
  let timestamp: number | null = null;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    if (k === "t") timestamp = Number.parseInt(v, 10);
    else if (k === "v1") v1Signatures.push(v);
  }
  if (timestamp === null || Number.isNaN(timestamp) || v1Signatures.length === 0) return false;

  // Timestamp freshness check (replay defense)
  if (Math.abs(nowSec - timestamp) > toleranceSec) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  // Any v1 signature matching is acceptable (Stripe rotates during secret rollover)
  return v1Signatures.some((sig) => timingSafeEqualHex(expected, sig));
}

// ─────────────────────────────────────────────────────────────────────────────
// Resend / Svix
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a Resend (Svix) webhook signature.
 *
 * Svix sends three headers:
 *   svix-id:        unique message id
 *   svix-timestamp: seconds since epoch
 *   svix-signature: space-separated list of `v1,<base64(hmac_sha256(...))>`
 *
 * Signed payload = `${svix-id}.${svix-timestamp}.${body}`
 * Secret format: `whsec_<base64>` — we strip the prefix and base64-decode.
 *
 * @param svixId         value of `svix-id` header
 * @param svixTimestamp  value of `svix-timestamp` header (seconds since epoch, string)
 * @param svixSignature  value of `svix-signature` header (space-separated list)
 * @param rawBody        raw request body string
 * @param secret         webhook secret (may include `whsec_` prefix)
 * @param toleranceSec   max age of timestamp; default 300s
 * @param nowSec         injectable for tests
 */
export function verifyResendSignature(
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  rawBody: string,
  secret: string,
  toleranceSec = TOLERANCE_SEC,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature || !secret) return false;

  const timestamp = Number.parseInt(svixTimestamp, 10);
  if (Number.isNaN(timestamp)) return false;
  if (Math.abs(nowSec - timestamp) > toleranceSec) return false;

  // Strip whsec_ prefix, base64-decode to raw secret bytes.
  const rawSecret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const secretBytes = Buffer.from(rawSecret, "base64");
  if (secretBytes.length === 0) return false;

  const signedPayload = `${svixId}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedPayload).digest("base64");

  // Header is space-separated "v1,<sig> v1,<sig2> ..." — any match accepted.
  for (const part of svixSignature.split(" ")) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    if (timingSafeEqualBase64(expected, sig)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export type WebhookProvider = "twilio" | "stripe" | "resend" | "bandwidth" | "telnyx" | "generic";

/**
 * Provider-dispatched verifier. Wraps the individual verifiers above with a
 * common signature so API routes can do:
 *
 *   const ok = verifyWebhookByProvider("stripe", {
 *     rawBody, headers: req.headers, url, secret,
 *   });
 *   if (!ok) return new NextResponse("invalid signature", { status: 401 });
 */
export function verifyWebhookByProvider(
  provider: WebhookProvider,
  opts: {
    rawBody: string;
    headers: Headers;
    url?: string;
    form?: Record<string, string>;
    secret: string;
    toleranceSec?: number;
  },
): boolean {
  const { rawBody, headers, url, form, secret, toleranceSec } = opts;
  switch (provider) {
    case "twilio":
      return verifyTwilioSignature(
        url ?? "",
        form,
        form ? null : rawBody,
        headers.get("x-twilio-signature"),
        secret,
      );
    case "stripe":
      return verifyStripeSignature(
        rawBody,
        headers.get("stripe-signature"),
        secret,
        toleranceSec,
      );
    case "resend":
      return verifyResendSignature(
        headers.get("svix-id"),
        headers.get("svix-timestamp"),
        headers.get("svix-signature"),
        rawBody,
        secret,
        toleranceSec,
      );
    case "bandwidth":
    case "telnyx":
    case "generic":
    default:
      return verifyWebhookSignature(
        rawBody,
        headers.get("x-signature") ?? headers.get("x-hub-signature-256"),
        secret,
      );
  }
}
