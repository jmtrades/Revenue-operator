/**
 * GET /api/solo/continuity?workspace_id=...
 * Solo surface: five booleans. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSoloContinuity } from "@/lib/surfaces/solo-continuity";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const payload = await getSoloContinuity(workspaceId);
  return NextResponse.json(payload);
}
