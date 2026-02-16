/**
 * GET /api/operational/external-recognition?workspace_id=...
 * recognized_as_shared_process only. True when two counterparties acknowledged in 7 days.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getExternalRecognition } from "@/lib/environment-recognition";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const result = await getExternalRecognition(workspaceId);
  return NextResponse.json(result);
}
