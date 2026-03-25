/**
 * GET /api/operational/record-references
 * Short factual lines when record was referenced in last 7 days. No timestamps, counts, or ids.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getRecordReferenceLinesInLastDays } from "@/lib/record-reference";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const DAYS = 7;

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const lines = await getRecordReferenceLinesInLastDays(workspaceId, DAYS);
  return NextResponse.json(lines);
}
