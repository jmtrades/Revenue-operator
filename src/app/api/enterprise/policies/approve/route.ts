/**
 * POST /api/enterprise/policies/approve — record approval for a policy (append-only).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  const workspaceId = body.workspace_id?.trim();
  const objectId = body.object_id ?? body.policy_id;
  if (!workspaceId || !objectId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const { data: p } = await db.from("speech_policies").select("version, status").eq("id", objectId).maybeSingle();
  if (!p) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  const version = (p as { version: number }).version;

  await db.from("speech_policies").update({ status: "approved" }).eq("id", objectId);
  const session = await (await import("@/lib/auth/request-session")).getSession(req);
  const userId = session?.userId ?? null;
  await db.from("speech_approvals").insert({
    workspace_id: workspaceId,
    object_type: "policy",
    object_id: objectId,
    approved_version: version,
    approved_by_user_id: userId,
  });
  await db.from("audit_log").insert({
    workspace_id: workspaceId,
    actor_user_id: userId,
    actor_type: "user",
    action_type: "policy_approved",
    details_json: { policy_id: objectId, version },
  });

  return NextResponse.json({ ok: true });
}
