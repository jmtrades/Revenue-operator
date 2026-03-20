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
import { sendEmail } from "@/lib/integrations/email";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    // Verify cron authorization (same pattern as all other crons)
    const authErr = assertCronAuthorized(req);
    if (authErr) return authErr;

    const db = getDb();

    // Get all active workspaces
    const { data: workspaces } = await db
      .from("workspaces")
      .select("id, name, billing_tier, billing_status, owner_id")
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
        owner_id?: string | null;
      };

      try {
        const usage = await checkUsageThresholds(wsData.id);
        const maxPct = Math.max(usage.minutes_pct, usage.sms_pct);
        const alertLevel = getUsageAlertLevel(maxPct);

        if (alertLevel === "critical") {
          log("warn", "usage_alerts.critical", { workspace_id: wsData.id, name: wsData.name, max_pct: Math.round(maxPct), minutes_used: usage.minutes_used, minutes_limit: usage.minutes_limit, sms_used: usage.sms_used, sms_limit: usage.sms_limit });
          warnings.push({
            workspace_id: wsData.id,
            name: wsData.name,
            level: "critical",
            minutes_pct: Math.round(usage.minutes_pct),
            sms_pct: Math.round(usage.sms_pct),
          });
        } else if (alertLevel === "warning") {
          log("warn", "usage_alerts.warning", { workspace_id: wsData.id, name: wsData.name, max_pct: Math.round(maxPct), minutes_used: usage.minutes_used, minutes_limit: usage.minutes_limit, sms_used: usage.sms_used, sms_limit: usage.sms_limit });
          warnings.push({
            workspace_id: wsData.id,
            name: wsData.name,
            level: "warning",
            minutes_pct: Math.round(usage.minutes_pct),
            sms_pct: Math.round(usage.sms_pct),
          });
        } else if (alertLevel === "exceeded") {
          log("error", "usage_alerts.exceeded", { workspace_id: wsData.id, name: wsData.name, minutes_used: usage.minutes_used, minutes_limit: usage.minutes_limit, sms_used: usage.sms_used, sms_limit: usage.sms_limit });
          warnings.push({
            workspace_id: wsData.id,
            name: wsData.name,
            level: "exceeded",
            minutes_pct: Math.round(usage.minutes_pct),
            sms_pct: Math.round(usage.sms_pct),
          });
        }

        // Email alerts (80% and 100% minutes only). Deduped monthly via settings.usage_alerts_state
        try {
          const minutesPct = usage.minutes_limit > 0 ? (usage.minutes_used / usage.minutes_limit) : 0;
          const threshold = minutesPct >= 1 ? "100" : minutesPct >= 0.8 ? "80" : null;
          if (threshold && wsData.owner_id) {
            const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
            const { data: settingsRow } = await db
              .from("settings")
              .select("usage_alerts_state")
              .eq("workspace_id", wsData.id)
              .maybeSingle();
            const state =
              (settingsRow as { usage_alerts_state?: Record<string, string> } | null)?.usage_alerts_state ?? {};
            const sentKey = `${monthKey}:${threshold}`;
            if (!state[sentKey]) {
              const { data: owner } = await db.from("users").select("email").eq("id", wsData.owner_id).maybeSingle();
              const email = (owner as { email?: string } | null)?.email?.trim();
              if (email) {
                const subject =
                  threshold === "100"
                    ? `Recall Touch: minutes limit exceeded`
                    : `Recall Touch: 80% of minutes used`;
                const body =
                  threshold === "100"
                    ? `<p>You’ve exceeded your included minutes for this month.</p><p>Usage: <strong>${usage.minutes_used}/${usage.minutes_limit}</strong> minutes.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/app/settings/billing">Upgrade</a> to avoid overage.</p>`
                    : `<p>You’ve used <strong>${usage.minutes_used}/${usage.minutes_limit}</strong> minutes this month.</p><p>Upgrade before you hit 100%.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/app/settings/billing">Upgrade</a></p>`;
                await sendEmail(wsData.id, email, subject, body, { template_slug: "usage_alert" }).catch(() => ({ ok: false }));
                const nextState: Record<string, string> = { ...state, [sentKey]: new Date().toISOString() };
                await db
                  .from("settings")
                  .upsert({ workspace_id: wsData.id, usage_alerts_state: nextState, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log("error", "usage_alerts.email_alert_error", { workspace_id: wsData.id, error: msg });
        }

        checked++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("error", "usage_alerts.workspace_check_error", { workspace_id: wsData.id, error: msg });
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
    log("error", "cron.usage_alerts.unexpected_error", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
