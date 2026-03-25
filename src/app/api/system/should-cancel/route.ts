/**
 * GET /api/system/should-cancel?workspace_id=...
 * Retention/churn: process_required, risk_if_removed, active_dependence. Reuses disable-impact + dependence.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDisableImpactStatements } from "@/lib/operational-perception/disable-impact";
import { outcomesDependOnProcess } from "@/lib/operational-perception/dependence-recognition";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const [disableImpact, dependence] = await Promise.all([
    getDisableImpactStatements(workspaceId),
    outcomesDependOnProcess(workspaceId),
  ]);

  const risk_if_removed = disableImpact.length > 0;
  const active_dependence = dependence;
  const process_required = active_dependence || risk_if_removed;

  return NextResponse.json({
    process_required,
    risk_if_removed,
    active_dependence,
  });
}
