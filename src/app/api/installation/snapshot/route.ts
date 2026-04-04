/**
 * GET /api/installation/snapshot?workspace_id=...
 * Returns { snapshot_text } (latest). On first view when activation_ready, sets snapshot_seen_at and phase → active.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getInstallationState,
  generateInstallationSnapshot,
  setSnapshotSeen,
  getLatestSnapshotText,
} from "@/lib/installation";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const state = await getInstallationState(workspaceId);
  if (!state) {
    return NextResponse.json({ error: "No installation state" }, { status: 404 });
  }
  if (state.phase !== "activation_ready" && state.phase !== "active") {
    return NextResponse.json({
      phase: state.phase,
      message: "Snapshot available after observation period.",
    });
  }

  let snapshot_text: string | null = await getLatestSnapshotText(workspaceId);
  if (!snapshot_text && state.phase === "activation_ready") {
    snapshot_text = await generateInstallationSnapshot(workspaceId);
  }
  if (!snapshot_text) {
    snapshot_text = await generateInstallationSnapshot(workspaceId);
  }

  if (state.phase === "activation_ready") {
    await setSnapshotSeen(workspaceId);
    const { transitionInstallationPhase } = await import("@/lib/installation");
    await transitionInstallationPhase(workspaceId).catch((err) => { log("error", "[installation/snapshot] error:", { error: err instanceof Error ? err.message : err }); });
  }

  return NextResponse.json({ snapshot_text });
}
