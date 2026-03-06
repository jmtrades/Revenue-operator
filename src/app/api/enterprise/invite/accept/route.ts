/**
 * GET/POST /api/enterprise/invite/accept?token=...
 * When invite token used: creates workspace membership (if session), emits operator_invited and operator_joined.
 * No email. No onboarding wizard.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { recordMilestone } from "@/lib/ops/milestones";
import { getSession } from "@/lib/auth/request-session";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "token required" }, { status: 200 });
  }

  const db = getDb();
  const { data: invite } = await db
    .from("workspace_invites")
    .select("id, workspace_id, accepted_at")
    .eq("invite_token", token)
    .limit(1)
    .maybeSingle();

  if (!invite || (invite as { accepted_at: string | null }).accepted_at) {
    return NextResponse.json({ ok: false, reason: "invalid_or_used" }, { status: 200 });
  }

  const workspaceId = (invite as { workspace_id: string }).workspace_id;
  const inviteId = (invite as { id: string }).id;

  await recordMilestone(workspaceId, "operator_invited", { invite_id: inviteId });
  await recordMilestone(workspaceId, "operator_joined", { invite_id: inviteId });

  const session = await getSession(request);
  const userId = session?.userId ?? null;
  if (userId) {
    try {
      await db.from("workspace_roles").insert({
        workspace_id: workspaceId,
        user_id: userId,
        role: "operator",
      });
    } catch {
      // Duplicate or schema: ignore
    }
  }

  await db
    .from("workspace_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq("id", inviteId);

  return NextResponse.json({
    ok: true,
    workspace_id: workspaceId,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
