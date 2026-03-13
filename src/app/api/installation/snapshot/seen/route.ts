/**
 * POST /api/installation/snapshot/seen
 * Body: { workspace_id }. Sets snapshot_seen_at=now() and phase → active. Idempotent.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { setSnapshotSeen } from "@/lib/installation";

export async function POST(request: NextRequest) {
  let body: { workspace_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspaceId = body.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  await setSnapshotSeen(workspaceId);
  const { transitionInstallationPhase } = await import("@/lib/installation");
  await transitionInstallationPhase(workspaceId).catch(() => {});
  return NextResponse.json({ ok: true });
}
