/**
 * GET /api/operational/first-impact?workspace_id=...
 * Factual statements from current state only. No counts, time ranges, or improvement claims.
 * Used immediately after installation.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirstImpactStatements } from "@/lib/operational-perception/first-impact";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const statements = await getFirstImpactStatements(workspaceId);
  return NextResponse.json(statements);
}
