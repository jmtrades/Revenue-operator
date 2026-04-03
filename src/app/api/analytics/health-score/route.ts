export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiInternalError } from "@/lib/api/errors";
import { computeWorkspaceHealth } from "@/lib/intelligence/workspace-health-score";
import { log } from "@/lib/logger";

export const GET = withWorkspace(async (_req: NextRequest, ctx: WorkspaceContext) => {
  try {
    const health = await computeWorkspaceHealth(ctx.workspaceId);
    return apiOk(health);
  } catch (err) {
    log("error", "analytics.health_score_failed", {
      workspace_id: ctx.workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return apiInternalError("Failed to compute workspace health score");
  }
});
