/**
 * Billing usage endpoint
 * GET /api/billing/usage?workspace_id=...
 * Returns current usage breakdown and daily chart data
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkUsageThresholds, getUsageAlertLevel, getDailyUsageBreakdown } from "@/lib/billing/overage";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const usage = await checkUsageThresholds(workspaceId);
    const dailyUsage = await getDailyUsageBreakdown(workspaceId);
    const alertLevel = getUsageAlertLevel(Math.max(usage.minutes_pct, usage.sms_pct));

    return NextResponse.json({
      minutes_used: usage.minutes_used,
      minutes_limit: usage.minutes_limit,
      sms_used: usage.sms_used,
      sms_limit: usage.sms_limit,
      minutes_percentage: Math.round(usage.minutes_pct),
      sms_percentage: Math.round(usage.sms_pct),
      is_over_limit: usage.is_over_limit,
      overage_minutes: usage.overage_minutes,
      overage_sms: usage.overage_sms,
      estimated_overage_cost: (usage.estimated_overage_cents / 100).toFixed(2),
      alert_level: alertLevel,
      usage_by_day: dailyUsage,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "[billing/usage]", { error: msg });
    return NextResponse.json({ error: "Failed to load usage data" }, { status: 500 });
  }
}
