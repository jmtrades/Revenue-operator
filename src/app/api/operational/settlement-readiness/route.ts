/**
 * GET /api/operational/settlement-readiness
 * Payment justification: three booleans. Settlement activates only when
 * environment_handling_operations AND manual_supervision_reduced.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSettlementReadiness } from "@/lib/operational-perception/settlement-readiness";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const readiness = await getSettlementReadiness(workspaceId);
  return NextResponse.json(readiness);
}
