/**
 * GET /api/org/state-feed?workspace_id=...
 * Organization surface: last 20 doctrine statements (proof, disable impact, retention, incidents). Text only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getOrgStateFeedStatements } from "@/lib/surfaces/state-feed";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const statements = await getOrgStateFeedStatements(workspaceId);
  return NextResponse.json(statements);
}
