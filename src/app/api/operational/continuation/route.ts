/**
 * GET /api/operational/continuation?workspace_id=...
 * Returns factual lines for exposures stopped in last 7 days. No numbers, no counts.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getContinuationLinesStoppedInLastDays } from "@/lib/continuation-engine";

const DAYS = 7;

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const lines = await getContinuationLinesStoppedInLastDays(workspaceId, DAYS);
  return NextResponse.json(lines);
}
