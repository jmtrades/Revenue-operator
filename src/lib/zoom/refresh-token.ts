/**
 * Proactive Zoom token refresh: call when expires_at is near (e.g. within 1 hour).
 */

import { getDb } from "@/lib/db/queries";
import { decrypt } from "@/lib/encryption";

const REFRESH_THRESHOLD_MS = 60 * 60 * 1000;

export async function refreshZoomTokenIfNeeded(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("zoom_accounts")
    .select("access_token_enc, refresh_token_enc, expires_at")
    .eq("workspace_id", workspaceId)
    .is("disconnected_at", null)
    .single();

  if (!data) return false;
  const row = data as { access_token_enc: string; refresh_token_enc: string; expires_at: string };
  const expiresAt = new Date(row.expires_at);
  const now = new Date();
  if (expiresAt.getTime() - now.getTime() >= REFRESH_THRESHOLD_MS) return false;

  const refreshTokenRaw = await decrypt(row.refresh_token_enc);
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) return false;

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenRaw,
    }).toString(),
  });

  if (!res.ok) return false;
  const tokenData = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  const newExpiresAt = new Date();
  newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in);

  const { encrypt } = await import("@/lib/encryption");
  const accessEnc = await encrypt(tokenData.access_token);
  const update: { access_token_enc: string; expires_at: string; updated_at: string; refresh_token_enc?: string } = {
    access_token_enc: accessEnc,
    expires_at: newExpiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (tokenData.refresh_token) {
    update.refresh_token_enc = await encrypt(tokenData.refresh_token);
  }
  await db.from("zoom_accounts").update(update).eq("workspace_id", workspaceId);
  return true;
}

export async function refreshAllZoomTokensNearExpiry(): Promise<number> {
  const db = getDb();
  const threshold = new Date();
  threshold.setTime(threshold.getTime() + REFRESH_THRESHOLD_MS);
  const { data: rows } = await db
    .from("zoom_accounts")
    .select("workspace_id")
    .is("disconnected_at", null)
    .lt("expires_at", threshold.toISOString());
  let refreshed = 0;
  for (const r of rows ?? []) {
    const ok = await refreshZoomTokenIfNeeded((r as { workspace_id: string }).workspace_id);
    if (ok) refreshed++;
  }
  return refreshed;
}
