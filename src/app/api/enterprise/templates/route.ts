/**
 * GET /api/enterprise/templates?workspace_id=...
 * POST /api/enterprise/templates (create draft)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator", "auditor", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const { data: rows } = await db
    .from("speech_templates")
    .select("id, workspace_id, domain_type, jurisdiction, channel, intent_type, clause_type, template_key, template_body, version, status, created_at")
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ ok: true, templates: rows ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 200 });
  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator"]);
  if (authErr) return authErr;

  const domainType = body.domain_type ?? "general";
  const jurisdiction = body.jurisdiction ?? "UK";
  const channel = body.channel ?? "sms";
  if (!["sms", "email", "whatsapp"].includes(channel)) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
  const templateKey = body.template_key?.trim() || body.template_body?.slice(0, 30) || "unnamed";
  const templateBody = body.template_body ?? "";
  if (templateBody.length > 500) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });

  const db = getDb();
  const { data: inserted } = await db
    .from("speech_templates")
    .insert({
      workspace_id: workspaceId,
      domain_type: domainType,
      jurisdiction,
      channel,
      intent_type: body.intent_type ?? "follow_up",
      clause_type: body.clause_type ?? "acknowledgment",
      template_key: templateKey,
      template_body: templateBody,
      version: 1,
      status: "draft",
    })
    .select("id, template_key, version, status")
    .single();

  if (!inserted) return NextResponse.json({ ok: false, reason: "workspace_creation_failed" }, { status: 200 });
  const id = (inserted as { id: string }).id;
  await db.from("audit_log").insert({
    workspace_id: workspaceId,
    actor_user_id: null,
    actor_type: "user",
    action_type: "template_updated",
    details_json: { template_id: id, template_key: templateKey, created: true },
  });
  return NextResponse.json({ ok: true, id, template_key: (inserted as { template_key: string }).template_key, version: 1, status: "draft" });
}
