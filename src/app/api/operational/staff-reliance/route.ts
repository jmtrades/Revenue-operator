/**
 * GET /api/operational/staff-reliance?workspace_id=...
 * Boolean: staff using environment for coordination (>=3 reliance events across >=2 days).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStaffReliance } from "@/lib/staff-reliance";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const result = await getStaffReliance(workspaceId);
  return NextResponse.json(result);
}
