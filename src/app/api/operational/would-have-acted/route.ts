/**
 * GET /api/operational/would-have-acted?workspace_id=...
 * One-line past-tense statements of what would have executed when gate blocked. No timestamps or counts.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWouldHaveActedStatements } from "@/lib/shadow-execution";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const statements = await getWouldHaveActedStatements(workspaceId);
  return NextResponse.json(statements);
}
