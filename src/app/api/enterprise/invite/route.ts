/**
 * POST /api/enterprise/invite
 * Creates invite token (append-only). Returns shareable link. No email. Institutional language only.
 * Enterprise only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  let body: { workspace_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
  }
  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) {
    return NextResponse.json({ ok: false, reason: "workspace_id required" }, { status: 200 });
  }

  const authErr = await requireWorkspaceRole(request, workspaceId, ["owner", "admin"]);
  if (authErr) return authErr;

  const inviteToken = randomUUID();
  const db = getDb();

  await db.from("workspace_invites").insert({
    workspace_id: workspaceId,
    invite_token: inviteToken,
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl?.origin ?? "";
  const link = `${base.replace(/\/$/, "")}/api/enterprise/invite/accept?token=${encodeURIComponent(inviteToken)}`;

  return NextResponse.json({
    ok: true,
    link,
    token: inviteToken,
  });
}
