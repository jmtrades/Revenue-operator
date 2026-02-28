/**
 * GET /api/enterprise/audit/export?workspace_id=...
 * Export governance record: orientation, approvals, action_intents, outcomes, audit. Ordering preserved. No analytics.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

const LIMIT = 500;

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "auditor", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();

  const [approvals, intents, audit] = await Promise.all([
    db
      .from("message_approvals")
      .select("id, status, created_at, decided_at, decided_by")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(LIMIT),
    db
      .from("action_intents")
      .select("id, intent_type, created_at, completed_at, result_status")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(LIMIT),
    db
      .from("audit_log")
      .select("id, action_type, details_json, recorded_at")
      .eq("workspace_id", workspaceId)
      .order("recorded_at", { ascending: true })
      .limit(LIMIT),
  ]);

  return NextResponse.json({
    ok: true,
    governance_record: {
      approvals: approvals.data ?? [],
      action_intents: intents.data ?? [],
      audit: audit.data ?? [],
      exported_at: new Date().toISOString(),
    },
  }, { status: 200 });
}
