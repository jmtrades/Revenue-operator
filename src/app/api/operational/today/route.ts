/**
 * GET /api/operational/today
 * Loss recognition: present-tense operational statements only. No amounts, percentages, or analytics.
 * Returns only an array of lines.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { generateOperationalStatements } from "@/lib/operational-perception/statements";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const lines = await generateOperationalStatements(workspaceId);
  return NextResponse.json(lines);
}
