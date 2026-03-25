/**
 * GET /api/operational/dependence-recognition?workspace_id=...
 * Returns { outcomes_depend_on_process: boolean }.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { outcomesDependOnProcess } from "@/lib/operational-perception/dependence-recognition";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const outcomes_depend_on_process = await outcomesDependOnProcess(workspaceId);
  return NextResponse.json({ outcomes_depend_on_process });
}
