export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiInternalError } from "@/lib/api/errors";
import { getSmsDeliveryMetrics, getRecentFailedSms } from "@/lib/telephony/sms-delivery-tracker";

export const GET = withWorkspace(async (_req: NextRequest, ctx: WorkspaceContext) => {
  try {
    const [metrics, recentFailures] = await Promise.all([
      getSmsDeliveryMetrics(ctx.workspaceId, 7),
      getRecentFailedSms(ctx.workspaceId, 10),
    ]);
    return apiOk({ metrics, recentFailures });
  } catch (err) {
    return apiInternalError("Failed to fetch SMS delivery metrics");
  }
});
