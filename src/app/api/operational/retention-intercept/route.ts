/**
 * GET /api/operational/retention-intercept?workspace_id=...
 * Factual operational consequences for cancel/deactivate: recent operation, current dependency, if disabled.
 * No persuasion, marketing, or analytics. Reuses existing doctrine-safe wording only.
 * Requires session auth + workspace access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getRetentionInterceptPayload } from "@/lib/operational-perception/retention-intercept";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const payload = await getRetentionInterceptPayload(workspaceId);
  return NextResponse.json(payload);
}
