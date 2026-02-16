/**
 * GET /api/operational/environment-presence?workspace_id=...
 * coordination_outside_environment_unlikely only. No explanation text.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEnvironmentPresence } from "@/lib/shared-environment-density";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const presence = await getEnvironmentPresence(workspaceId);
  return NextResponse.json(presence);
}
