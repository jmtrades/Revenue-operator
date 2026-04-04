export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiInternalError } from "@/lib/api/errors";
import { computeAutoTargets } from "@/lib/intelligence/auto-targeting";
import { log } from "@/lib/logger";

export const GET = withWorkspace(async (req: NextRequest, ctx: WorkspaceContext) => {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 200);
  try {
    const result = await computeAutoTargets(ctx.workspaceId, limit);
    return apiOk(result);
  } catch (err) {
    log("error", "analytics.auto_targets_failed", {
      workspace_id: ctx.workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return apiInternalError("Failed to compute auto-targeting");
  }
});
