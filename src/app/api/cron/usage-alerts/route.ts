/**
 * Usage alerts cron endpoint
 * GET /api/cron/usage-alerts?secret=...
 * Checks all active workspaces for usage thresholds and logs alerts
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertCronAuthorized } from "@/lib/runtime";
import { checkUsageThresholds, getUsageAlertLevel } from "@/lib/billing/overage";

export async function GET(req: NextRequest) {
  try {
    // Verify cron authorization (same pattern as all other crons)
    const authErr = assertCronAuthorized(req);
    if (authErr) return authErr;

    const db = getDb();

    // Get all active workspaces
    const { data: workspaces } = await db
      .from("workspaces")
      .select("id, name, billing_tier, billing_status")
      .eq("billing_status", "active");

    if (!workspaces || workspaces.length === 0) {
      return NextResponse.json({ ok: true, checked: 0 });
    }

    let checked = 0;
    const warnings: Array<{
      workspace_id: string;
      name?: string;
      level: string;
      minutes_pct: number;
      sms_pct: number;
    }> = [];

    for (const ws of workspaces) {
      const wsData = ws as {
        id: string;
        name?: string;
        billing_tier?: string;
        billing_status?: string;
      };

      try {
        const usage = await checkUsageThresholds(wsData.id);
        const maxPct = Math.max(usage.minutes_pct, usage.sms_pct);
        const alertLevel = getUsageAlertLevel(maxPct);

        if (alertLevel === "critical") {
          console.warn(
            `[usage-alerts] CRITICAL: Workspace ${wsData.id} (${wsData.name}) at ${Math.round(
              maxPct
            )}% usage. Minutes: ${usage.minutes_used}/${usage.minutes_limit}, SMS: ${usage.sms_used}/${usage.sms_limit}`
          );
          warnings.push({
            workspace_id: wsData.id,
            name: wsData.name,
            level: "critical",
            minutes_pct: Math.round(usage.minutes_pct),
            sms_pct: Math.round(usage.sms_pct),
          });
        } else if (alertLevel === "warning") {
          console.warn(
            `[usage-alerts] WARNING: Workspace ${wsData.id} (${wsData.name}) at ${Math.round(
              maxPct
            )}% usage. Minutes: ${usage.minutes_used}/${usage.minutes_limit}, SMS: ${usage.sms_used}/${usage.sms_limit}`
          );
          warnings.push({
            workspace_id: wsData.id,
            name: wsData.name,
            level: "warning",
            minutes_pct: Math.round(usage.minutes_pct),
            sms_pct: Math.round(usage.sms_pct),
          });
        } else if (alertLevel === "exceeded") {
          console.error(
            `[usage-alerts] EXCEEDED: Workspace ${wsData.id} (${wsData.name}) exceeded limits. Minutes: ${usage.minutes_used}/${usage.minutes_limit}, SMS: ${usage.sms_used}/${usage.sms_limit}`
          );
          warnings.push({
            workspace_id: wsData.id,
            name: wsData.name,
            level: "exceeded",
            minutes_pct: Math.round(usage.minutes_pct),
            sms_pct: Math.round(usage.sms_pct),
          });
        }

        checked++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[usage-alerts] Error checking workspace ${wsData.id}:`, msg);
      }
    }

    return NextResponse.json({
      ok: true,
      checked,
      warnings_issued: warnings.length,
      warnings,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cron/usage-alerts] Unexpected error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
