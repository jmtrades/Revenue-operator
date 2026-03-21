/**
 * GET /api/org/operational-overview?workspace_id=...
 * Organization surface: five booleans. No numbers. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getOrgOperationalOverview } from "@/lib/surfaces/org-overview";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const overview = await getOrgOperationalOverview(workspaceId);
    return NextResponse.json(overview);
  } catch (err) {
    console.error("[operational-overview]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
