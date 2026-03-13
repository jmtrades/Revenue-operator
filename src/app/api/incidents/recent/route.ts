/**
 * GET /api/incidents/recent
 * Last 5 incident statements only. No history, no filters.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getRecentIncidentStatements } from "@/lib/incidents";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const incidents = await getRecentIncidentStatements(workspaceId, 5);
  return NextResponse.json({ incidents });
}
