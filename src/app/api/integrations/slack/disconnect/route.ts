/**
 * POST /api/integrations/slack/disconnect — Remove Slack token and channel prefs for workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;


  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
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
