/**
 * GET /api/enterprise/approvals?workspace_id=... — list pending message approvals (limit 50).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getPendingApprovals } from "@/lib/governance/approval-queue";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator", "auditor", "compliance"]);
  if (authErr) return authErr;

  const list = await getPendingApprovals(workspaceId, 50);
  return NextResponse.json({ ok: true, pending: list });
}
