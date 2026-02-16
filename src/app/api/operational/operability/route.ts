/**
 * GET /api/operational/operability
 * Short factual lines when process maintains operation. No timestamps, counts, or ids. Max 3 lines.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOperabilityLines } from "@/lib/operability-anchor";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const lines = await getOperabilityLines(workspaceId);
  return NextResponse.json(lines);
}
