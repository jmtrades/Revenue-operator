/**
 * GET /api/operational/operability
 * Short factual lines when process maintains operation. No timestamps, counts, or ids. Max 3 lines.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOperabilityLines } from "@/lib/operability-anchor";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const lines = await getOperabilityLines(workspaceId);
  return NextResponse.json(lines);
}
