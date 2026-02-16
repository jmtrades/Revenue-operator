/**
 * GET /api/life/assurance?workspace_id=...
 * Individual life surface: three booleans. No reminders. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getLifeAssurance } from "@/lib/surfaces/life-assurance";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const payload = await getLifeAssurance(workspaceId);
  return NextResponse.json(payload);
}
