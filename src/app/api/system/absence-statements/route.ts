/**
 * GET /api/system/absence-statements?workspace_id=...
 * Factual statements for absence moments only: cancel, pause, disconnect, billing failure, export.
 * Return disable-impact and retention-intercept. No persuasion. Display statements only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDisableImpactStatements } from "@/lib/operational-perception/disable-impact";
import { getRetentionInterceptPayload } from "@/lib/operational-perception/retention-intercept";

const MAX_LINE = 90;

function trim(s: string): string {
  return s.length > MAX_LINE ? s.slice(0, MAX_LINE).trim() : s.trim();
}

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const [disableImpact, retention] = await Promise.all([
    getDisableImpactStatements(workspaceId),
    getRetentionInterceptPayload(workspaceId),
  ]);

  const statements = {
    what_would_fail: disableImpact.slice(0, 6).map(trim).filter(Boolean),
    recent_operation: retention.recent_operation.slice(0, 4).map(trim).filter(Boolean),
    current_dependency: retention.current_dependency.slice(0, 4).map(trim).filter(Boolean),
    if_disabled: retention.if_disabled.slice(0, 4).map(trim).filter(Boolean),
  };

  return NextResponse.json(statements);
}
