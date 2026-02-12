/**
 * Cookie-based session so the user only enters email once.
 * Server restores session on every request; APIs trust cookies.
 */

import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "revenue_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year
const SPLIT = ".";

function getSecret(): string | null {
  return process.env.SESSION_SECRET ?? process.env.ENCRYPTION_KEY ?? null;
}

function sign(payload: string): string {
  const secret = getSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function verify(payload: string, signature: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const expected = sign(payload);
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature, "base64url"), Buffer.from(expected, "base64url"));
  } catch {
    return false;
  }
}

export interface SessionPayload {
  userId: string;
  workspaceId?: string;
  exp: number;
}

export function createSessionCookie(payload: Omit<SessionPayload, "exp">): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const data: SessionPayload = { ...payload, exp };
  const payloadStr = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = sign(payloadStr);
  const value = `${payloadStr}${SPLIT}${signature}`;
  const isProd = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${isProd ? "; Secure" : ""}`;
}

export function getSessionFromCookie(cookieHeader: string | null): SessionPayload | null {
  if (!cookieHeader) return null;
  if (!getSecret()) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const value = match?.[1];
  if (!value) return null;
  const [payloadStr, signature] = value.split(SPLIT);
  if (!payloadStr || !signature || !verify(payloadStr, signature)) return null;
  try {
    const data = JSON.parse(Buffer.from(payloadStr, "base64url").toString()) as SessionPayload;
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
