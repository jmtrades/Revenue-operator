/**
 * GET /api/installation/state?workspace_id=...
 * Returns phase, observation_started_at, activated_at, activation_ready_at, snapshot_generated_at, snapshot_seen_at.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getInstallationState, ensureWorkspaceInstallationState } from "@/lib/installation";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  let state = await getInstallationState(workspaceId);
  if (!state) {
    await ensureWorkspaceInstallationState(workspaceId).catch((err) => { log("error", "[installation/state] error:", { error: err instanceof Error ? err.message : err }); });
    state = await getInstallationState(workspaceId);
  }
  if (!state) {
    return NextResponse.json({ error: "No installation state" }, { status: 404 });
  }

  return NextResponse.json({
    phase: state.phase,
    observation_started_at: state.observation_started_at,
    activation_ready_at: state.activation_ready_at,
    activated_at: state.activated_at,
    snapshot_generated_at: state.snapshot_generated_at,
    snapshot_seen_at: state.snapshot_seen_at,
  });
}
