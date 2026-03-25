/**
 * GET /api/operational/reversion-impact?workspace_id=...
 * Factual conditional statements only. No persuasion.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getReversionImpactStatements } from "@/lib/operational-perception/reversion-impact";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const statements = await getReversionImpactStatements(workspaceId);
  return NextResponse.json(statements);
}
