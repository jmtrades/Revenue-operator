/**
 * GET /api/operational/settlement-readiness
 * Payment justification: three booleans. Settlement activates only when
 * environment_handling_operations AND manual_supervision_reduced.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSettlementReadiness } from "@/lib/operational-perception/settlement-readiness";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const readiness = await getSettlementReadiness(workspaceId);
  return NextResponse.json(readiness);
}
