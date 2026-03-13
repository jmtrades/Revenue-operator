/**
 * GET /api/operational/orientation-state?workspace_id=...
 * Booleans only: orientation_recently_viewed, absence_signal_eligible, pending_confirmation_recent.
 * No times, no counts.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOperationalOrientationStateBooleans } from "@/lib/orientation/records";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const state = await getOperationalOrientationStateBooleans(workspaceId);
  return NextResponse.json(state);
}
