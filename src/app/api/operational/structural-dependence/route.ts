/**
 * GET /api/operational/structural-dependence?workspace_id=...
 * Boolean: organization operates inside environment.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStructuralDependence } from "@/lib/structural-dependence";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const result = await getStructuralDependence(workspaceId);
  return NextResponse.json(result);
}
