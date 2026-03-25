/**
 * POST /api/team/invite/resend — Resend invite email for a pending invite.
 * Body: { workspace_id, invite_id }.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { sendInviteEmail } from "@/lib/email/invite";
import { assertSameOrigin } from "@/lib/http/csrf";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";
const EXPIRES_DAYS = 7;

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

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
    .select("id, workspace_id, email, role, invited_by")
    .eq("id", inviteId)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
  }

  const inv = invite as { id: string; workspace_id: string; email: string; role: string; invited_by: string | null };
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRES_DAYS);

  await db
    .from("workspace_invites")
    .update({ invite_token: token, expires_at: expiresAt.toISOString() })
    .eq("id", inv.id);

  const [{ data: ws }, { data: inviterUser }] = await Promise.all([
    db.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
    inv.invited_by ? db.from("users").select("email").eq("id", inv.invited_by).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const workspaceName = (ws as { name?: string } | null)?.name?.trim() ?? "The workspace";
  const inviterEmail = (inviterUser as { email?: string } | null)?.email ?? "";
  const inviterName = inviterEmail ? inviterEmail.split("@")[0]?.replace(/[._-]/g, " ") ?? "A team member" : "A team member";
  const inviterNameCap = inviterName ? inviterName.charAt(0).toUpperCase() + inviterName.slice(1) : inviterName;

  const acceptUrl = `${APP_URL.replace(/\/$/, "")}/accept-invite?token=${encodeURIComponent(token)}`;
  const sendResult = await sendInviteEmail(inv.email, {
    inviterName: inviterNameCap,
    workspaceName,
    role: inv.role,
    acceptUrl,
  });

  if (!sendResult.ok) {
    return NextResponse.json(
      { error: sendResult.error ?? "Failed to resend email. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
