export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiInternalError } from "@/lib/api/errors";
import { detectRevenueLeaks } from "@/lib/intelligence/revenue-leak-detector";
import { log } from "@/lib/logger";

export const GET = withWorkspace(async (_req: NextRequest, ctx: WorkspaceContext) => {
  try {
    const report = await detectRevenueLeaks(ctx.workspaceId);
    return apiOk(report);
  } catch (err) {
    log("error", "analytics.revenue_leaks_failed", {
      workspace_id: ctx.workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return apiInternalError("Failed to generate revenue leak report");
  }
});
