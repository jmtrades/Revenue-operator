/**
 * GET /api/enterprise/policies/[id] — get one. PATCH — update template_id, approval_mode, required_disclaimers, forbidden_phrases, required_phrases.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId || !id) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator", "auditor", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const { data: row } = await db
    .from("message_policies")
    .select("id, workspace_id, domain_type, jurisdiction, channel, intent_type, template_id, required_disclaimers, forbidden_phrases, required_phrases, approval_mode, created_at, updated_at")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!row) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, policy: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });

  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId || !id) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.template_id !== undefined) update.template_id = body.template_id;
  if (body.approval_mode !== undefined) update.approval_mode = body.approval_mode;
  if (Array.isArray(body.required_disclaimers)) update.required_disclaimers = body.required_disclaimers;
  if (Array.isArray(body.forbidden_phrases)) update.forbidden_phrases = body.forbidden_phrases;
  if (Array.isArray(body.required_phrases)) update.required_phrases = body.required_phrases;

  const { data, error } = await db
    .from("message_policies")
    .update(update)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error || !data) return NextResponse.json({ ok: false, reason: "not_found_or_update_failed" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
