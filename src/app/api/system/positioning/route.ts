/**
 * GET /api/system/positioning?workspace_id=...
 * Category positioning: static description from institutional_state. UI only. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getInstitutionalState } from "@/lib/institutional-state";

const LABELS: Record<string, string> = {
  none: "Monitoring",
  embedded: "Operational Reliance",
  reliant: "Operational Reliance",
  assumed: "Operational Infrastructure",
  institutional: "Institutional Dependence",
};

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const state = await getInstitutionalState(workspaceId);
  const positioning = LABELS[state] ?? "Monitoring";
  return NextResponse.json({ positioning });
}
