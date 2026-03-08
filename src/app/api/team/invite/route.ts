/**
 * POST /api/team/invite — Send team invite by email.
 * Body: { workspace_id, email, role }.
 * Creates workspace_invites row and sends invite email via Resend.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { sendInviteEmail } from "@/lib/email/invite";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";
const INVITABLE_ROLES = ["admin", "manager", "agent"] as const;
const EXPIRES_DAYS = 7;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const workspaceId = body.workspace_id?.trim();
  const email = body.email?.trim().toLowerCase();
  const role = (body.role?.trim() ?? "agent").toLowerCase();

  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  if (!INVITABLE_ROLES.includes(role as (typeof INVITABLE_ROLES)[number])) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin"]);
  if (authErr) return authErr;

  const session = await getSession(req);
  const userId = session?.userId ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  // Already a member?
  const { data: existingMember } = await db
    .from("team_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .maybeSingle();
  if (existingMember) {
    return NextResponse.json({ error: "This email is already a member" }, { status: 400 });
  }

  // Pending invite?
  const { data: pending } = await db
    .from("workspace_invites")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (pending) {
    return NextResponse.json({ error: "An invite was already sent to this email" }, { status: 400 });
  }

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRES_DAYS);

  const { data: workspace } = await db
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();
  const workspaceName = (workspace as { name?: string } | null)?.name?.trim() ?? "The workspace";

  let inviterName = "A team member";
  try {
    const { data: user } = await db.from("users").select("email").eq("id", userId).maybeSingle();
    const emailStr = (user as { email?: string } | null)?.email ?? "";
    inviterName = emailStr.split("@")[0]?.replace(/[._-]/g, " ") ?? inviterName;
    if (inviterName) inviterName = inviterName.charAt(0).toUpperCase() + inviterName.slice(1);
  } catch {
    // ignore
  }

  const { data: inserted, error: insertErr } = await db
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      invite_token: token,
      email,
      role,
      invited_by: userId,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const acceptUrl = `${APP_URL.replace(/\/$/, "")}/accept-invite?token=${encodeURIComponent(token)}`;
  const sendResult = await sendInviteEmail(email, {
    inviterName,
    workspaceName,
    role,
    acceptUrl,
  });

  if (!sendResult.ok) {
    return NextResponse.json(
      { error: sendResult.error ?? "Failed to send invite email. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    invite: {
      id: (inserted as { id: string }).id,
      email,
      role,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    },
  });
}
