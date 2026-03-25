/**
 * GET /api/operational/disable-impact?workspace_id=...
 * Deterministic counterfactual: what would require manual handling if the process stopped.
 * Evidence from recorded operational tables only (last 7 days). Max 6 lines, ≤90 chars each.
 * No prediction, analytics, or advice. Requires session auth + workspace access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDisableImpactStatements } from "@/lib/operational-perception/disable-impact";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const lines = await getDisableImpactStatements(workspaceId);
  return NextResponse.json(lines);
}
