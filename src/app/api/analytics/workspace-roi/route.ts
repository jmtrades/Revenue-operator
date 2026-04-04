export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiInternalError } from "@/lib/api/errors";
import { calculateWorkspaceROI } from "@/lib/analytics/workspace-roi";

export const GET = withWorkspace(async (_req: NextRequest, ctx: WorkspaceContext) => {
  try {
    const roi = await calculateWorkspaceROI(ctx.workspaceId, 90);
    return apiOk(roi);
  } catch (err) {
    return apiInternalError("Failed to calculate workspace ROI");
  }
});
