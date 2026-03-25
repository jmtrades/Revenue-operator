/**
 * GET /api/operational/if-disabled
 * Removal simulation: neutral conditional statements from recent history. No threats or sales language.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getIfDisabledStatements } from "@/lib/operational-perception/if-disabled";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const statements = await getIfDisabledStatements(workspaceId);
  return NextResponse.json(statements);
}
