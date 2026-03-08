/**
 * POST /api/team/invite/revoke — Revoke a pending invite.
 * Body: { workspace_id, invite_id }.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; invite_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const workspaceId = body.workspace_id?.trim();
  const inviteId = body.invite_id?.trim();
  if (!workspaceId || !inviteId) {
    return NextResponse.json({ error: "workspace_id and invite_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin"]);
  if (authErr) return authErr;

  const session = await getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const { data: invite } = await db
    .from("workspace_invites")
    .select("id")
    .eq("id", inviteId)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
  }

  await db
    .from("workspace_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  return NextResponse.json({ ok: true });
}
