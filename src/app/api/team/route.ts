/**
 * GET /api/team — List team members and pending invites for workspace.
 * Includes workspace owner as first member; pending invites from workspace_invites.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;
  const db = getDb();
  try {
    const [wsRes, membersRes, session] = await Promise.all([
      db.from("workspaces").select("id, name, owner_id").eq("id", workspaceId).maybeSingle(),
      db.from("team_members").select("id, name, email, role, is_on_call, created_at").eq("workspace_id", workspaceId).order("created_at"),
      getSession(req),
    ]);
    const workspace = wsRes.data as { id: string; name?: string; owner_id?: string } | null;
    const members = (membersRes.data ?? []) as Array<{ id: string; name: string; email: string; role: string; is_on_call?: boolean; created_at?: string }>;
    const currentUserId = session?.userId ?? null;
    const ownerId = workspace?.owner_id ?? null;

    let team = [...members];
    if (ownerId) {
      const { data: ownerUser } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const ownerEmail = (ownerUser as { email?: string } | null)?.email ?? "";
      const isOwnerInList = members.some((m) => m.role === "owner" || (ownerEmail && m.email === ownerEmail));
      if (!isOwnerInList) {
        const ownerName = currentUserId === ownerId ? "You" : ownerEmail ? ownerEmail.split("@")[0] ?? "Owner" : "Owner";
        team = [
          { id: ownerId, name: ownerName, email: ownerEmail, role: "owner", is_on_call: false, created_at: "" },
          ...members,
        ];
      }
    }

    const { data: invites } = await db
      .from("workspace_invites")
      .select("id, email, role, created_at, expires_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      ;
    const pendingInvites = (invites ?? [])
      .filter((i: { email?: string | null }) => i.email)
      .filter((i: { expires_at?: string | null }) => !i.expires_at || new Date(i.expires_at) > new Date())
      .map((i: { id: string; email: string; role: string; created_at?: string }) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        invitedAt: i.created_at ?? new Date().toISOString(),
      }));

    return NextResponse.json({ team, pendingInvites });
  } catch {
    return NextResponse.json({ team: [], pendingInvites: [] });
  }
}
