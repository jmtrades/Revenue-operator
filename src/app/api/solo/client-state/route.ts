/**
 * GET /api/solo/client-state?workspace_id=...&reference=...
 * Solo surface: current_dependency, if_disabled, latest_outcome. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSoloClientState } from "@/lib/surfaces/solo-client-state";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  const reference = request.nextUrl.searchParams.get("reference") ?? null;
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const payload = await getSoloClientState(workspaceId, reference);
  return NextResponse.json(payload);
}
