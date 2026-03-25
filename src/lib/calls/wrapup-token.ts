/**
 * Wrap-up tokens: create, verify, consume. One-time use, expiring.
 */

import { getDb } from "@/lib/db/queries";
import crypto from "crypto";

const TOKEN_BYTES = 24;
const EXPIRY_DAYS = 7;

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createWrapupToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export async function createWrapupTokenForCall(
  workspaceId: string,
  callSessionId: string
): Promise<{ token: string; url: string }> {
  const db = getDb();
  const { token, tokenHash } = createWrapupToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);

  await db.from("call_wrapup_tokens").insert({
    workspace_id: workspaceId,
    call_session_id: callSessionId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  return { token, url: `${baseUrl}/wrapup/${token}` };
}

export async function verifyWrapupToken(
  rawToken: string
): Promise<{ valid: true; callSessionId: string; workspaceId: string } | { valid: false; reason: string }> {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const { data: row } = await db
    .from("call_wrapup_tokens")
    .select("call_session_id, workspace_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!row) return { valid: false, reason: "invalid" };
  const r = row as { call_session_id: string; workspace_id: string; expires_at: string; used_at?: string | null };
  if (r.used_at) return { valid: false, reason: "used" };
  if (new Date(r.expires_at) < new Date()) return { valid: false, reason: "expired" };
  return { valid: true, callSessionId: r.call_session_id, workspaceId: r.workspace_id };
}

export async function consumeWrapupToken(rawToken: string): Promise<{ callSessionId: string; workspaceId: string } | null> {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const { data: row } = await db
    .from("call_wrapup_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .select("call_session_id, workspace_id")
    .maybeSingle();

  if (!row) return null;
  return { callSessionId: (row as { call_session_id: string }).call_session_id, workspaceId: (row as { workspace_id: string }).workspace_id };
}
