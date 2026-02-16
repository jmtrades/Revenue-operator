/**
 * GET /api/operational/settlement-context?workspace_id=...
 * administrative_activation_available only. True when settlement_understood and readiness true.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSettlementContext } from "@/lib/operational-perception/settlement-context";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const context = await getSettlementContext(workspaceId);
  return NextResponse.json(context);
}
