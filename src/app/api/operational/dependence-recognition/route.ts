/**
 * GET /api/operational/dependence-recognition?workspace_id=...
 * Returns { outcomes_depend_on_process: boolean }.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { outcomesDependOnProcess } from "@/lib/operational-perception/dependence-recognition";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const outcomes_depend_on_process = await outcomesDependOnProcess(workspaceId);
  return NextResponse.json({ outcomes_depend_on_process });
}
