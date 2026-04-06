/**
 * POST /api/invite/accept — Accept team invite (token in body). Session required.
 * Marks invite accepted, adds user to workspace (team_members + workspace_roles), returns redirect URL.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { assertSameOrigin } from "@/lib/http/csrf";
import { ROUTES } from "@/lib/constants";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const token = body.token?.trim();
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const session = await getSession(req);
  const userId = session?.userId ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const { data: invite } = await db
    .from("workspace_invites")
    .select("id, workspace_id, email, role, status, expires_at")
    .eq("invite_token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const inv = invite as { id: string; workspace_id: string; email: string | null; role: string | null; status: string | null; expires_at: string | null };
  if (inv.status !== "pending") return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (inv.expires_at && new Date(inv.expires_at) <= new Date()) return NextResponse.json({ error: "expired" }, { status: 400 });

  const workspaceId = inv.workspace_id;
  const role = (inv.role ?? "agent").toLowerCase();
  const teamRole = role === "admin" ? "admin" : role === "manager" ? "operator" : "operator";

  const { data: ws } = await db.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
  const workspaceName = (ws as { name?: string } | null)?.name?.trim() ?? "your workspace";

  try {
    await db.from("workspace_invites").update({
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
      status: "accepted",
    }).eq("id", inv.id);

    const { data: user } = await db.from("users").select("email").eq("id", userId).maybeSingle();
    const email = (user as { email?: string } | null)?.email ?? inv.email ?? "";
    const localPart = email.split("@")[0];
    const name = (localPart && localPart.replace(/[._-]/g, " ").trim()) || "Member";

    try {
      await db.from("workspace_roles").insert({
        workspace_id: workspaceId,
        user_id: userId,
        role: teamRole,
      });
    } catch {
      // Already has role; update or ignore
    }

    try {
      await db.from("team_members").insert({
        workspace_id: workspaceId,
        user_id: userId,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
        role: teamRole,
      });
    } catch {
      // Unique on (workspace_id, email) may already exist; ignore
    }
  } catch {
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }

  const redirectUrl = `${APP_URL.replace(/\/$/, "")}${ROUTES.APP_HOME}?welcome=${encodeURIComponent(workspaceName)}`;
  return NextResponse.json({ ok: true, redirectUrl });
}
