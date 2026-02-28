/**
 * GET /api/enterprise/policies?workspace_id=... — list message_policies (domain_type, jurisdiction, channel, intent_type, approval_mode, template_id).
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
    .from("message_policies")
    .select("id, workspace_id, domain_type, jurisdiction, channel, intent_type, template_id, required_disclaimers, forbidden_phrases, required_phrases, approval_mode, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  return NextResponse.json({ ok: true, policies: rows ?? [] });
}
