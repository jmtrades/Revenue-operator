/**
 * POST /api/enterprise/approvals/decide — approve or reject a pending message approval.
 * Body: workspace_id, approval_id, decision (approved | rejected).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { decideApproval } from "@/lib/governance/approval-queue";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 200 });
  const workspaceId = body.workspace_id?.trim();
  const approvalId = body.approval_id?.trim();
  const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : null;
  if (!workspaceId || !approvalId || !decision)
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator"]);
  if (authErr) return authErr;

  const session = await getSession(req);
  const decidedBy = session?.userId ?? null;

  const updated = await decideApproval(approvalId, workspaceId, decision, decidedBy);
  if (!updated) return NextResponse.json({ ok: false, reason: "not_found_or_already_decided" }, { status: 200 });
  return NextResponse.json({ ok: true, decision });
}
