/**
 * GET /api/operational/continuity
 * Daily relief proof: last 24h continuity summary. Three booleans only; no counts or metrics.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getContinuitySummary } from "@/lib/operational-perception/continuity-summary";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const summary = await getContinuitySummary(workspaceId);
  return NextResponse.json(summary);
}
