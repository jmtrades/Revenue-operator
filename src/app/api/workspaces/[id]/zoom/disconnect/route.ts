/**
 * Disconnect Zoom: revoke upstream, remove tokens, stop ingestion. Call
 * sessions remain (they're historical records, not credentials).
 *
 * Phase 78 / Phase 5 (P0-11 Data, GDPR/CCPA): before deleting the local
 * row, call Zoom's token revoke endpoint. `revokeProviderToken` is
 * fail-soft — an upstream outage can't block the user's disconnect.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { revokeProviderToken } from "@/lib/security/oauth-revoke";
import { decrypt } from "@/lib/encryption";
import { log } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id: workspaceId } = await params;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;
  const db = getDb();
  const { data: account } = await db
    .from("zoom_accounts")
    .select("id, access_token_enc, refresh_token_enc")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!account) return NextResponse.json({ ok: true, message: "Not connected" });

  // Phase 78/Phase 5: revoke upstream BEFORE local delete.
  const acct = account as {
    id: string;
    access_token_enc?: string | null;
    refresh_token_enc?: string | null;
  };
  // Prefer refresh token for revoke (it invalidates derived access tokens),
  // fall back to access token if the refresh token is missing.
  const enc = acct.refresh_token_enc ?? acct.access_token_enc ?? null;
  if (enc) {
    try {
      const plaintext = await decrypt(enc);
      if (plaintext) {
        await revokeProviderToken("zoom", plaintext);
      }
    } catch (err) {
      log("warn", "zoom_disconnect.decrypt_or_revoke_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await db.from("zoom_accounts").delete().eq("workspace_id", workspaceId);
  return NextResponse.json({ ok: true });
}
