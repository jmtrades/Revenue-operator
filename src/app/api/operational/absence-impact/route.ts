/**
 * GET /api/operational/absence-impact
 * Short factual lines when non-participation or silence windows exist. No timestamps, counts, or ids.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAbsenceImpactLines } from "@/lib/detachment";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const lines = await getAbsenceImpactLines(workspaceId);
  return NextResponse.json(lines);
}
