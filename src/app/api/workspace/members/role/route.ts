/**
 * PATCH /api/workspace/members/role — Update a team member's role.
 * Body: { memberId: string, role: "admin" | "manager" | "viewer" }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

const VALID_ROLES = new Set(["admin", "manager", "viewer"]);

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: { memberId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { memberId, role } = body;
  if (!memberId || !role || !VALID_ROLES.has(role)) {
    return NextResponse.json(
      { error: "memberId and role (admin, manager, viewer) are required" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Verify the caller is an admin or the workspace owner
  const { data: callerMember } = await db
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", session.workspaceId)
    .eq("user_id", session.userId)
    .maybeSingle();

  const callerRole = (callerMember as { role?: string } | null)?.role;

  // Also check if caller is the workspace owner
  const { data: workspace } = await db
    .from("workspaces")
    .select("owner_id")
    .eq("id", session.workspaceId)
    .maybeSingle();

  const isOwner = (workspace as { owner_id?: string } | null)?.owner_id === session.userId;

  if (!isOwner && callerRole !== "admin") {
    return NextResponse.json(
      { error: "Only admins and workspace owners can change roles" },
      { status: 403 }
    );
  }

  // Prevent changing the owner's role
  if (memberId === (workspace as { owner_id?: string } | null)?.owner_id) {
    return NextResponse.json(
      { error: "Cannot change the workspace owner's role" },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("workspace_members")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("workspace_id", session.workspaceId)
    .eq("user_id", memberId);

  if (error) {
    console.error("[members/role]", error.message);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role });
}
