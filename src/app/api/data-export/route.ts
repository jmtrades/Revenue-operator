export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiError, apiBadRequest } from "@/lib/api/errors";
import { requestExport, getPendingExports } from "@/lib/data-export/export-controller";

/** GET — list pending export requests for this workspace */
export const GET = withWorkspace(async (_req: NextRequest, ctx: WorkspaceContext) => {
  const pending = await getPendingExports(ctx.workspaceId);
  return apiOk({ requests: pending });
});

/** POST — request a new data export */
export const POST = withWorkspace(
  async (req: NextRequest, ctx: WorkspaceContext) => {
    const body = await req.clone().json().catch(() => null);
    if (!body || !body.scope || !body.reason) {
      return apiBadRequest("scope and reason are required");
    }

    const validScopes = ["leads", "calls", "analytics", "full"];
    if (!validScopes.includes(body.scope)) {
      return apiBadRequest(`scope must be one of: ${validScopes.join(", ")}`);
    }

    const userId = ctx.session.userId;
    const result = await requestExport(ctx.workspaceId, userId, body.scope, body.reason);
    if (!result.ok) {
      return apiError("RATE_LIMITED", result.message ?? result.error ?? "Export failed", 429);
    }

    return apiOk({ requestId: result.requestId, message: result.message });
  },
  { workspaceFrom: "body" },
);
