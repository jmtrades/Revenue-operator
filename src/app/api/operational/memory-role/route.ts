/**
 * GET /api/operational/memory-role?workspace_id=...
 * Array of statements for memory replacement events that actually occurred in last 7 days.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getMemoryRoleStatements } from "@/lib/memory-replacement";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const statements = await getMemoryRoleStatements(workspaceId);
  return NextResponse.json(statements);
}
