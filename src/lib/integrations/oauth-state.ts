/**
 * HMAC-signed OAuth state parameter to prevent CSRF.
 * Format: base64url(JSON({workspaceId, ts})).signature
 */

import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  return process.env.SESSION_SECRET ?? process.env.ENCRYPTION_KEY ?? "";
}

/** Create a signed OAuth state string containing the workspace ID. */
export function createOAuthState(workspaceId: string, extra?: Record<string, string>): string {
  const payload = Buffer.from(
    JSON.stringify({ workspaceId, ts: Date.now(), ...extra })
  ).toString("base64url");
  const secret = getSecret();
  if (!secret) return payload; // Dev fallback: unsigned
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/** Verify and extract workspace ID from signed state. Returns null if invalid/expired. */
export function verifyOAuthState(state: string, maxAgeMs: number = 600_000): string | null {
  const dotIndex = state.lastIndexOf(".");
  const secret = getSecret();

  let payload: string;
  if (dotIndex > 0 && secret) {
    payload = state.slice(0, dotIndex);
    const sig = state.slice(dotIndex + 1);
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (sig.length !== expected.length) return null;
    try {
      if (!timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) return null;
    } catch {
      return null;
    }
  } else if (!secret) {
    // Dev mode: no secret configured, accept unsigned state
    payload = dotIndex > 0 ? state.slice(0, dotIndex) : state;
  } else {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      workspaceId?: string;
      ts?: number;
    };
    if (!data.workspaceId) return null;
    // Check expiry (default 10 minutes)
    if (data.ts && Date.now() - data.ts > maxAgeMs) return null;
    return data.workspaceId;
  } catch {
    // Invalid payload — reject (no raw workspace_id fallback to prevent CSRF bypass)
    return null;
  }
}
