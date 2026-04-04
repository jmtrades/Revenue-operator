/**
 * Weekly email digest — sends every Monday at 8am via Vercel cron.
 * Summarizes: calls answered, appointments booked, follow-ups sent, revenue recovered.
 * Uses daily_metrics table for aggregation.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertCronAuthorized } from "@/lib/runtime";
import { sendEmail } from "@/lib/integrations/email";

interface DailyMetricRow {
  calls_answered: number;
  calls_missed: number;
  appointments_booked: number;
  no_shows_recovered: number;
  leads_captured: number;
  revenue_estimated_cents: number;
  response_time_avg_seconds: number | null;
}

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();

  // Date range: last 7 days
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  // Get all active workspaces with owners
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, name, owner_id")
    .in("billing_status", ["active", "trialing"])
    .eq("status", "active");

  if (!workspaces || workspaces.length === 0) {
    return NextResponse.json({ ok: true, message: "No active workspaces", sent: 0 });
  }

  let sent = 0;
  let errors = 0;

  for (const ws of workspaces as Array<{ id: string; name?: string | null; owner_id: string }>) {
    try {
      // Get owner email
      const { data: user } = await db
        .from("users")
        .select("email")
        .eq("id", ws.owner_id)
        .maybeSingle();

      if (!user || !(user as { email?: string }).email) continue;
      const ownerEmail = (user as { email: string }).email;

      // Fetch weekly metrics
      const { data: rows } = await db
        .from("daily_metrics")
        .select("calls_answered, calls_missed, appointments_booked, no_shows_recovered, leads_captured, revenue_estimated_cents, response_time_avg_seconds")
        .eq("workspace_id", ws.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (!rows || rows.length === 0) continue;

      const metrics = (rows as DailyMetricRow[]);

      const totals = metrics.reduce(
        (acc, row) => ({
          calls_answered: acc.calls_answered + (row.calls_answered ?? 0),
          calls_missed: acc.calls_missed + (row.calls_missed ?? 0),
          appointments_booked: acc.appointments_booked + (row.appointments_booked ?? 0),
          no_shows_recovered: acc.no_shows_recovered + (row.no_shows_recovered ?? 0),
          leads_captured: acc.leads_captured + (row.leads_captured ?? 0),
          revenue_estimated_cents: acc.revenue_estimated_cents + (row.revenue_estimated_cents ?? 0),
        }),
        {
          calls_answered: 0,
          calls_missed: 0,
          appointments_booked: 0,
          no_shows_recovered: 0,
          leads_captured: 0,
          revenue_estimated_cents: 0,
        },
      );

      // Skip if no meaningful activity at all
      if (
        totals.calls_answered === 0 &&
        totals.leads_captured === 0 &&
        totals.revenue_estimated_cents === 0
      ) continue;

      const revenue = (totals.revenue_estimated_cents / 100).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      const workspaceName = ws.name || "Your business";

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #09090b; color: #fafafa; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .header { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .subheader { font-size: 14px; color: #a1a1aa; margin-bottom: 32px; }
    .hero { background: linear-gradient(135deg, #18181b, #27272a); border: 1px solid #3f3f46; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .hero-amount { font-size: 36px; font-weight: 800; color: #22c55e; }
    .hero-label { font-size: 13px; color: #a1a1aa; margin-top: 4px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
    .stat { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; }
    .stat-value { font-size: 24px; font-weight: 700; }
    .stat-label { font-size: 12px; color: #a1a1aa; margin-top: 2px; }
    .cta { display: inline-block; background: #fafafa; color: #09090b; font-weight: 600; font-size: 14px; padding: 10px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; }
    .footer { font-size: 12px; color: #71717a; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Your Weekly Revenue Recap</div>
    <div class="subheader">${workspaceName} — ${startDate} to ${endDate}</div>

    <div class="hero">
      <div class="hero-amount">$${revenue}</div>
      <div class="hero-label">Estimated revenue recovered this week</div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
      <tr>
        <td width="50%" style="padding: 6px;">
          <div class="stat">
            <div class="stat-value">${totals.calls_answered}</div>
            <div class="stat-label">Total calls</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;">
          <div class="stat">
            <div class="stat-value">${totals.appointments_booked}</div>
            <div class="stat-label">Appointments booked</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding: 6px;">
          <div class="stat">
            <div class="stat-value">${totals.leads_captured}</div>
            <div class="stat-label">Leads captured</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;">
          <div class="stat">
            <div class="stat-value">${totals.no_shows_recovered}</div>
            <div class="stat-label">Calls recovered</div>
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center;">
      <a href="https://recall-touch.com/app/analytics" class="cta">View Full Dashboard →</a>
    </div>

    <div class="footer">
      Revenue Operator — The AI Revenue Execution System<br>
      <a href="https://recall-touch.com/app/settings/notifications" style="color: #71717a;">Manage email preferences</a>
    </div>
  </div>
</body>
</html>`;

      await sendEmail(
        ws.id,
        ownerEmail,
        `Your Revenue Operator weekly recap: $${revenue} recovered`,
        html,
      );

      sent++;
    } catch (err) {
      // Error (details omitted to protect PII): `[weekly-digest] Error for workspace ${ws.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, errors });
}
