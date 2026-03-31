/**
 * POST /api/workspace/members/remove — Remove a team member from the workspace.
 * Body: { memberId: string }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: { memberId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { memberId } = body;
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const db = getDb();

  // Verify the caller is an admin or the workspace owner
  const { data: workspace } = await db
    .from("workspaces")
    .select("owner_id")
    .eq("id", session.workspaceId)
    .maybeSingle();

  const isOwner = (workspace as { owner_id?: string } | null)?.owner_id === session.userId;

  if (!isOwner) {
    const { data: callerMember } = await db
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", session.workspaceId)
      .eq("user_id", session.userId)
      .maybeSingle();

    const callerRole = (callerMember as { role?: string } | null)?.role;
    if (callerRole !== "admin") {
      return NextResponse.json(
        { error: "Only admins and workspace owners can remove members" },
        { status: 403 }
      );
    }
  }

  // Cannot remove the owner
  if (memberId === (workspace as { owner_id?: string } | null)?.owner_id) {
    return NextResponse.json(
      { error: "Cannot remove the workspace owner" },
      { status: 400 }
    );
  }

  // Cannot remove yourself (use leave instead)
  if (memberId === session.userId) {
    return NextResponse.json(
      { error: "You cannot remove yourself. Use leave workspace instead." },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("workspace_members")
    .delete()
    .eq("workspace_id", session.workspaceId)
    .eq("user_id", memberId);

  if (error) {
    log("error", "[members/remove]", { error: error.message });
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
