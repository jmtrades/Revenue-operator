/**
 * GET /api/onboarding/state?workspace_id=<id>
 *
 * Phase 69 — DB-backed onboarding state snapshot. Derives completion
 * per-step from the tables each step actually writes to (workspaces,
 * agents, phone_configs, workspace_knowledge). Callers get back:
 *
 *   {
 *     workspace_id,
 *     steps: [{ step: "identity", complete: true }, ...],
 *     next_step: "agent" | null,
 *     is_complete: boolean,
 *     next_route: "/app/onboarding?step=agent" | "/app/overview",
 *     progress: 0..1
 *   }
 *
 * This is the canonical source the `/app/onboarding` client uses to resume
 * the wizard after a refresh or cross-device visit — no React state
 * required to carry progress.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authorizeOrg } from "@/lib/auth/authorize-org";
import { getOnboardingState } from "@/lib/onboarding/state-machine";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
  }

  const auth = await authorizeOrg(req, workspaceId, "viewer");
  if (!auth.ok) return auth.response;

  try {
    const state = await getOnboardingState(workspaceId);
    return NextResponse.json({
      workspace_id: state.workspaceId,
      steps: state.steps,
      next_step: state.nextStep,
      is_complete: state.isComplete,
      next_route: state.nextRoute,
      progress: Number(state.progress.toFixed(3)),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("error", "onboarding.state.failed", { workspace_id: workspaceId, error: errMsg });
    return NextResponse.json({ error: "Failed to load onboarding state" }, { status: 500 });
  }
}
