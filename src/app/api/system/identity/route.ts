/**
 * GET /api/system/identity?workspace_id=...
 * Operational identity: single sentence for surface display. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getOperationalIdentityLabel } from "@/lib/operational-identity/label";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const { label } = await getOperationalIdentityLabel(workspaceId);
  return NextResponse.json({ label });
}
