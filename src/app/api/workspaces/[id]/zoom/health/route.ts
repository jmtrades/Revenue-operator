/**
 * Zoom connection health: token valid, last webhook, recording access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;
  const db = getDb();
  const { data: account } = await db
    .from("zoom_accounts")
    .select("expires_at, last_webhook_at, disconnected_at, updated_at")
    .eq("workspace_id", workspaceId)
    .single();

  if (!account) {
    return NextResponse.json({ connected: false });
  }
  const a = account as { expires_at?: string; last_webhook_at?: string | null; disconnected_at?: string | null; updated_at?: string };
  if (a.disconnected_at) {
    return NextResponse.json({ connected: false });
  }
  const now = new Date();
  const expiresAt = a.expires_at ? new Date(a.expires_at) : null;
  const tokenValid = expiresAt ? expiresAt.getTime() - now.getTime() > 60 * 1000 : false;
  return NextResponse.json({
    connected: true,
    token_valid: tokenValid,
    expires_at: a.expires_at,
    last_webhook_at: a.last_webhook_at ?? null,
    updated_at: a.updated_at,
  });
}
