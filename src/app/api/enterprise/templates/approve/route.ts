/**
 * POST /api/enterprise/templates/approve — record approval for a template (append-only).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 200 });
  const workspaceId = body.workspace_id?.trim();
  const objectId = body.object_id ?? body.template_id;
  if (!workspaceId || !objectId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const { data: t } = await db.from("speech_templates").select("version, status").eq("id", objectId).maybeSingle();
  if (!t) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
  const version = (t as { version: number }).version;

  await db.from("speech_templates").update({ status: "approved" }).eq("id", objectId);
  const session = (await import("@/lib/auth/request-session")).getSession(req);
  const userId = session?.userId ?? null;
  await db.from("speech_approvals").insert({
    workspace_id: workspaceId,
    object_type: "template",
    object_id: objectId,
    approved_version: version,
    approved_by_user_id: userId,
  });
  await db.from("audit_log").insert({
    workspace_id: workspaceId,
    actor_user_id: userId,
    actor_type: "user",
    action_type: "template_approved",
    details_json: { template_id: objectId, version },
  });

  return NextResponse.json({ ok: true });
}
