/**
 * Edge-compatible session (Web Crypto only). Used by middleware.
 * Node API routes use session.ts (createHmac, timingSafeEqual).
 */

const COOKIE_NAME = "revenue_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year
const SPLIT = ".";

function getSecret(): string | null {
  return process.env.SESSION_SECRET ?? process.env.ENCRYPTION_KEY ?? null;
}

async function hmacSha256Base64Url(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  return atob(padded);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export interface SessionPayload {
  userId: string;
  workspaceId?: string;
  exp: number;
}

export async function getSessionFromCookieAsync(cookieHeader: string | null): Promise<SessionPayload | null> {
  if (!cookieHeader) return null;
  const secret = getSecret();
  if (!secret) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const value = match?.[1];
  if (!value) return null;
  const [payloadStr, signature] = value.split(SPLIT);
  if (!payloadStr || !signature) return null;
  try {
    const expected = await hmacSha256Base64Url(secret, payloadStr);
    const sigBytes = new Uint8Array(
      atob(signature.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const expBytes = new Uint8Array(
      atob(expected.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    if (!timingSafeEqual(sigBytes, expBytes)) return null;
    const data = JSON.parse(base64UrlDecode(payloadStr)) as SessionPayload;
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export function isSessionEnabled(): boolean {
  return getSecret() !== null;
}

function base64UrlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createSessionCookieAsync(payload: Omit<SessionPayload, "exp">): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const data: SessionPayload = { ...payload, exp };
  const payloadStr = base64UrlEncode(JSON.stringify(data));
  const signature = await hmacSha256Base64Url(secret, payloadStr);
  const value = `${payloadStr}${SPLIT}${signature}`;
  const isProd = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${isProd ? "; Secure" : ""}`;
}
