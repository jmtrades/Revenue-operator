/**
 * GET /api/operational/absence-effects?workspace_id=...
 * Conditional statements from real recorded behaviors only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAbsenceEffectsStatements } from "@/lib/absence-effects";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const statements = await getAbsenceEffectsStatements(workspaceId);
  return NextResponse.json(statements);
}
