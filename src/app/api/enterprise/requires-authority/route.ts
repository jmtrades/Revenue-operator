/**
 * GET /api/enterprise/requires-authority?workspace_id=...
 * Returns count of governance-related action intents not yet completed (documentary only).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

const GOVERNANCE_INTENTS = ["human_review_required", "policy_violation_detected", "template_missing"];

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator", "auditor", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const { count, error } = await db
    .from("action_intents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("intent_type", GOVERNANCE_INTENTS)
    .is("completed_at", null);

  if (error) return NextResponse.json({ ok: false, reason: "query_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, count: count ?? 0 });
}
