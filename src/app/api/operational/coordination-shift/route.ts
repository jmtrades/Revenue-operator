/**
 * GET /api/operational/coordination-shift?workspace_id=...
 * Returns factual lines for coordination displacement in last 7 days. No numbers.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDisplacementLinesInLastDays } from "@/lib/coordination-displacement";

const DAYS = 7;

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const lines = await getDisplacementLinesInLastDays(workspaceId, DAYS);
  return NextResponse.json(lines);
}
