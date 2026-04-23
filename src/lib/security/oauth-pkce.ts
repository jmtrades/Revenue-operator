/**
 * PKCE + signed-state primitives for OAuth flows (Phase 78 / Phase 5).
 *
 * Two concerns live in this module:
 *
 *   1. **PKCE (RFC 7636).** Before PKCE, any party that captured an OAuth
 *      `authorization_code` in flight — via browser extension, shared WiFi, or
 *      a log file — could exchange it for tokens. PKCE binds the code to a
 *      `code_verifier` that only the initiating session knows. The verifier
 *      is stored in an httpOnly cookie by the caller; the challenge
 *      (`base64url(sha256(verifier))`) goes to the authorization server. The
 *      server accepts the code exchange only if the caller sends back a
 *      matching verifier.
 *
 *   2. **Signed state.** The `state` query parameter is the only continuity
 *      between the authorization redirect and the callback. An unsigned
 *      state is forgeable — any attacker can send a `state` naming a
 *      workspace they don't own and trick the callback into upserting tokens
 *      into that workspace. We HMAC-SHA256 the state with a server secret
 *      and include an `exp` ≤ 5 minutes out. Callers verify with
 *      `crypto.timingSafeEqual` to avoid timing side-channels on signature
 *      mismatch.
 *
 * Why a dedicated secret (`OAUTH_STATE_SECRET`)? Two reasons:
 *
 *   - Separating OAuth state signing from session signing lets us rotate
 *     them independently and makes a stolen session secret less useful.
 *   - A forced ≥32-char length is a cheap way to guard against someone
 *     shipping with a placeholder like `"dev-secret"` that would make every
 *     state trivially forgeable.
 */

import crypto from "node:crypto";

/** The minimum we'll accept for the state-signing secret. */
const MIN_SECRET_LENGTH = 32;

/** Lifetime of a signed state, in seconds. */
const STATE_TTL_SECONDS = 300;

/** PKCE verifier length — 64 random bytes → 86-char base64url, trimmed to 96 for readability. */
const PKCE_VERIFIER_BYTES = 64;

/** Distinct error classes so callers can distinguish "misconfigured" from "untrusted" 500 vs 403. */
export class OAuthStateConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthStateConfigError";
  }
}

export class OAuthStateVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthStateVerificationError";
  }
}

/** Load and validate the state-signing secret. Throws if missing or too short. */
function stateSecret(): string {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s || s.length < MIN_SECRET_LENGTH) {
    throw new OAuthStateConfigError(
      `OAUTH_STATE_SECRET must be set and at least ${MIN_SECRET_LENGTH} chars`,
    );
  }
  return s;
}

/**
 * Sign a payload into a `base64url(JSON).base64url(HMAC-SHA256)` string.
 *
 * Payload keys must be strings — we store the serialized payload verbatim
 * (no extra canonicalization) since we sign the encoded bytes, not the parsed
 * object. This means whitespace / key-order changes would invalidate the
 * signature, which is the intent.
 */
export function signState(payload: Record<string, string>): string {
  const body = {
    ...payload,
    // 12-byte nonce makes every signed state unique even for identical
    // payloads within the same second — useful for replay detection and so
    // callers can't be surprised by two "same-looking" states colliding.
    nonce: crypto.randomBytes(12).toString("base64url"),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", stateSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * Verify a signed state string and return the embedded payload.
 *
 * Throws:
 *   - `OAuthStateConfigError` if `OAUTH_STATE_SECRET` is unset/short.
 *   - `OAuthStateVerificationError` on:
 *     - malformed state (missing `.` separator)
 *     - signature mismatch (wrong secret, tampered body/sig, etc.)
 *     - expired state (exp < now)
 *     - unparseable JSON body
 */
export function verifyState(state: string): Record<string, unknown> {
  const dot = state.indexOf(".");
  if (dot <= 0 || dot === state.length - 1) {
    throw new OAuthStateVerificationError("state: malformed");
  }
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);

  const expected = crypto
    .createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");

  // Constant-time compare. Buffer.from on two different-length base64url
  // strings would throw on timingSafeEqual, so bail early on length mismatch.
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) {
    throw new OAuthStateVerificationError("state: bad signature");
  }
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new OAuthStateVerificationError("state: bad signature");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
  } catch {
    throw new OAuthStateVerificationError("state: malformed payload");
  }

  const exp = parsed.exp;
  if (typeof exp !== "number" || exp < Math.floor(Date.now() / 1000)) {
    throw new OAuthStateVerificationError("state: expired");
  }
  return parsed;
}

/** The shape returned by `generatePKCE`. */
export interface PKCEArtifacts {
  code_verifier: string;
  code_challenge: string;
  code_challenge_method: "S256";
  state: string;
}

/**
 * Produce a fresh PKCE verifier/challenge pair and a signed state.
 *
 * The verifier is 64 random bytes encoded base64url (43–86 chars), well
 * inside RFC 7636's 43–128 range. The challenge is
 * `base64url(sha256(verifier))` — always 43 chars. `state` is whatever
 * payload the caller needs, with a 5-minute `exp` tacked on.
 */
export function generatePKCE(payload: Record<string, string>): PKCEArtifacts {
  const verifier = crypto.randomBytes(PKCE_VERIFIER_BYTES).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  const state = signState(payload);
  return {
    code_verifier: verifier,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  };
}
