/**
 * GET /api/operational/recent
 * Last 20 orientation records only. No counts, ids, timestamps, or metadata.
 * Chronological truth feed. Updates last_orientation_viewed_at when called.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getRecentOrientationStatements,
  updateLastOrientationViewedAt,
} from "@/lib/orientation/records";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const lines = await getRecentOrientationStatements(workspaceId, 20);
  await updateLastOrientationViewedAt(workspaceId).catch(() => {});

  return NextResponse.json(lines);
}
