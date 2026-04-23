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

  // ATOMIC CLAIM — Phase 78 Task 8.2.
  // Two clicks on the same invite link must not both succeed. We claim
  // the invite with an UPDATE gated on (accepted_at IS NULL AND expires_at
  // > now() AND status = 'pending'), returning the row only if the
  // claim actually landed. The second concurrent click sees no returned
  // row and is refused. No TOCTOU window between read and write.
  const nowIso = new Date().toISOString();
  const { data: claimed } = await db
    .from("workspace_invites")
    .update({
      accepted_at: nowIso,
      accepted_by: userId,
      status: "accepted",
    })
    .eq("invite_token", token)
    .is("accepted_at", null)
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .select("id, workspace_id, email, role")
    .maybeSingle();

  if (!claimed) {
    // Figure out whether the token never existed, was already used, or
    // expired — so the client can surface a clear error.
    const { data: probe } = await db
      .from("workspace_invites")
      .select("id, status, expires_at, accepted_at")
      .eq("invite_token", token)
      .maybeSingle();
    const p = probe as { status?: string | null; expires_at?: string | null; accepted_at?: string | null } | null;
    if (!p) return NextResponse.json({ error: "invalid" }, { status: 400 });
    if (p.accepted_at || p.status === "accepted") return NextResponse.json({ error: "already_accepted" }, { status: 400 });
    if (p.expires_at && new Date(p.expires_at) <= new Date()) return NextResponse.json({ error: "expired" }, { status: 400 });
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const inv = claimed as { id: string; workspace_id: string; email: string | null; role: string | null };
  const workspaceId = inv.workspace_id;
  const role = (inv.role ?? "operator").toLowerCase();
  const teamRole = role === "admin" ? "admin"
    : role === "closer" ? "closer"
    : role === "compliance" ? "compliance"
    : role === "auditor" ? "auditor"
    : "operator";

  const { data: ws } = await db.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
  const workspaceName = (ws as { name?: string } | null)?.name?.trim() ?? "your workspace";

  try {
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
