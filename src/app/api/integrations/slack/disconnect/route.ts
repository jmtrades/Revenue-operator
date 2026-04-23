/**
 * POST /api/integrations/slack/disconnect — Remove Slack token and channel prefs for workspace.
 *
 * Phase 78 / Phase 5 (P0-11 Data, GDPR/CCPA): call Slack's `auth.revoke`
 * before nulling out the local token so a stolen copy can't continue to
 * post into the user's workspace. The stored token is encrypted at rest —
 * we decrypt it for the revoke call, then proceed to null it locally
 * regardless of whether the upstream revoke succeeded (fail-soft).
 *
 * If decryption itself fails (e.g. key rotation), we log and skip the
 * upstream call — the user's local-state intent still takes effect.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { revokeProviderToken } from "@/lib/security/oauth-revoke";
import { decrypt } from "@/lib/encryption";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;


  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  // Phase 78/Phase 5: revoke upstream BEFORE nulling locally.
  const { data: cfg } = await db
    .from("workspace_slack_config")
    .select("access_token_encrypted")
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();
  const encrypted = (cfg as { access_token_encrypted?: string | null } | null)
    ?.access_token_encrypted;
  if (encrypted) {
    let plaintextToken = "";
    try {
      plaintextToken = await decrypt(encrypted);
    } catch (err) {
      log("warn", "slack_disconnect.decrypt_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (plaintextToken) {
      await revokeProviderToken("slack", plaintextToken);
    }
  }

  await db
    .from("workspace_slack_config")
    .update({ access_token_encrypted: null, team_id: null, team_name: null, updated_at: new Date().toISOString() })
    .eq("workspace_id", session.workspaceId);
  await db
    .from("workspace_notification_channels")
    .delete()
    .eq("workspace_id", session.workspaceId)
    .eq("provider", "slack");

  return NextResponse.json({ ok: true });
}
