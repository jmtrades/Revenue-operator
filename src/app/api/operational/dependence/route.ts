/**
 * GET /api/operational/dependence?workspace_id=...
 * Booleans only. No explanations.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDependenceBooleans } from "@/lib/operational-dependency-memory";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const booleans = await getDependenceBooleans(workspaceId);
  return NextResponse.json(booleans);
}
