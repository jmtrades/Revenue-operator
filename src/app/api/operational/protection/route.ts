/**
 * GET /api/operational/protection
 * Short factual lines for interrupted exposures in last 24 hours. No ids, timestamps, or metadata. Max 8 lines.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getInterruptedExposureLinesLast24h } from "@/lib/exposure-engine";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const lines = await getInterruptedExposureLinesLast24h(workspaceId, 8);
  return NextResponse.json(lines);
}
