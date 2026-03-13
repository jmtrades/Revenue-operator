/**
 * GET /api/operational/if-removed?workspace_id=...
 * Statements from actual recorded behavior only. No threats or persuasion.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getIfRemovedStatements } from "@/lib/operational-perception/if-removed";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const statements = await getIfRemovedStatements(workspaceId);
  return NextResponse.json(statements);
}
