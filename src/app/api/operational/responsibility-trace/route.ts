/**
 * GET /api/operational/responsibility-trace
 * Short factual lines from responsibility moments in last 7 days. No ids, timestamps, or counts. Max 90 chars per line.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getResponsibilityTraceLinesInLastDays } from "@/lib/responsibility-moments";

const DAYS = 7;

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const lines = await getResponsibilityTraceLinesInLastDays(workspaceId, DAYS);
  return NextResponse.json(lines);
}
