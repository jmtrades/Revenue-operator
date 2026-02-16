/**
 * GET /api/operational/continuity-duration?workspace_id=...
 * operations_have_been_continuous only. True when >= 5 consecutive operational days.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getContinuityDuration } from "@/lib/operational-timeline-memory";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const result = await getContinuityDuration(workspaceId);
  return NextResponse.json(result);
}
