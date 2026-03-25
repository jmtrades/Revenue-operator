/**
 * GET /api/operational/expectation-state?workspace_id=...
 * Boolean: operations expected to occur here.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getExpectationState } from "@/lib/operational-expectations";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const result = await getExpectationState(workspaceId);
  return NextResponse.json(result);
}
