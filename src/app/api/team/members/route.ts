/**
 * Team member management.
 * PATCH /api/team/members?member_id=xxx — Update member role.
 * DELETE /api/team/members?member_id=xxx — Remove member from workspace.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function PATCH(req: NextRequest) {
  let body: { workspace_id?: string; member_id?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id: workspaceId, member_id: memberId, role } = body;
  if (!workspaceId || !memberId || !role) {
    return NextResponse.json({ error: "workspace_id, member_id, and role required" }, { status: 400 });
  }

  const validRoles = ["owner", "admin", "operator", "closer", "auditor", "compliance"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  const { error } = await db
    .from("workspace_roles")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberId);

  if (error) {
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Role updated" });
}

export async function DELETE(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  const memberId = req.nextUrl.searchParams.get("member_id");

  if (!workspaceId || !memberId) {
    return NextResponse.json({ error: "workspace_id and member_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  const { error } = await db
    .from("workspace_roles")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberId);

  if (error) {
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Member removed" });
}
