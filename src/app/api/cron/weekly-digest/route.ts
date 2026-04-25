/**
 * Weekly email digest — sends every Monday at 8am via cron scheduler.
 * Summarizes: calls answered, appointments booked, follow-ups sent, revenue recovered.
 * Uses daily_metrics table for aggregation.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertCronAuthorized } from "@/lib/runtime";
import { sendEmail } from "@/lib/integrations/email";
import { log } from "@/lib/logger";

interface DailyMetricRow {
  total_calls: number;
  missed_calls: number;
  total_appointments: number;
  recovered_calls: number;
  total_leads: number;
  total_revenue_cents: number;
  avg_call_duration_seconds: number;
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
        .select("total_calls, missed_calls, total_appointments, recovered_calls, total_leads, total_revenue_cents, avg_call_duration_seconds")
        .eq("workspace_id", ws.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (!rows || rows.length === 0) continue;

      const metrics = (rows as DailyMetricRow[]);

      const totals = metrics.reduce(
        (acc, row) => ({
          total_calls: acc.total_calls + (row.total_calls ?? 0),
          missed_calls: acc.missed_calls + (row.missed_calls ?? 0),
          total_appointments: acc.total_appointments + (row.total_appointments ?? 0),
          recovered_calls: acc.recovered_calls + (row.recovered_calls ?? 0),
          total_leads: acc.total_leads + (row.total_leads ?? 0),
          total_revenue_cents: acc.total_revenue_cents + (row.total_revenue_cents ?? 0),
        }),
        {
          total_calls: 0,
          missed_calls: 0,
          total_appointments: 0,
          recovered_calls: 0,
          total_leads: 0,
          total_revenue_cents: 0,
        },
      );

      // Skip if no meaningful activity at all
      if (
        totals.total_calls === 0 &&
        totals.total_leads === 0 &&
        totals.total_revenue_cents === 0
      ) continue;

      const revenue = (totals.total_revenue_cents / 100).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      const workspaceName = ws.name || "Your business";

      // Phase 86 — Editorial-light email. Matches the marketing surface
      // brand we shipped in Phase 81 (Playfair Display, ivory cards,
      // Hermès-spaced eyebrows). Email-client-safe: table layout, inline
      // styles, no flexbox, no CSS grid, no <link> font references —
      // Playfair falls back gracefully to Georgia → serif.
      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your Revenue Operator weekly recap</title>
</head>
<body style="margin:0;padding:0;background:#FAFBFC;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif;color:#0A0A0B;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFBFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.08);border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#6A6D76;">Your week with Revenue Operator</p>
              <h1 style="margin:0 0 4px 0;font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:28px;line-height:1.15;letter-spacing:-0.02em;color:#0A0A0B;">${workspaceName}</h1>
              <p style="margin:0 0 24px 0;font-size:14px;color:#4A4E58;line-height:1.5;">Here&apos;s what your AI operator did from <strong style="color:#0A0A0B;">${startDate}</strong> to <strong style="color:#0A0A0B;">${endDate}</strong>.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0 6px;">
                <tr>
                  <td style="padding:20px 22px;background:#F7F8FA;border:1px solid rgba(0,0,0,0.06);border-radius:10px;text-align:center;">
                    <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#6A6D76;">Estimated revenue recovered</p>
                    <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:36px;line-height:1;color:#16A34A;letter-spacing:-0.025em;">$${revenue}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="padding:14px 16px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.08);border-radius:10px;vertical-align:top;">
                          <p style="margin:0 0 2px 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#6A6D76;">Total calls</p>
                          <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:24px;line-height:1.1;color:#0A0A0B;">${totals.total_calls}</p>
                        </td>
                        <td width="8"></td>
                        <td width="50%" style="padding:14px 16px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.08);border-radius:10px;vertical-align:top;">
                          <p style="margin:0 0 2px 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#6A6D76;">Appointments booked</p>
                          <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:24px;line-height:1.1;color:#0A0A0B;">${totals.total_appointments}</p>
                        </td>
                      </tr>
                      <tr><td colspan="3" height="6"></td></tr>
                      <tr>
                        <td width="50%" style="padding:14px 16px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.08);border-radius:10px;vertical-align:top;">
                          <p style="margin:0 0 2px 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#6A6D76;">Leads captured</p>
                          <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:24px;line-height:1.1;color:#0A0A0B;">${totals.total_leads}</p>
                        </td>
                        <td width="8"></td>
                        <td width="50%" style="padding:14px 16px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.08);border-radius:10px;vertical-align:top;">
                          <p style="margin:0 0 2px 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#6A6D76;">Calls recovered</p>
                          <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:24px;line-height:1.1;color:#0A0A0B;">${totals.recovered_calls}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 32px 32px;text-align:center;">
              <a href="https://www.recall-touch.com/app/analytics" style="display:inline-block;padding:12px 24px;background:#0A0A0B;color:#FFFFFF;text-decoration:none;border-radius:10px;font-size:14px;font-weight:500;">Open dashboard &rarr;</a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px 32px;">
              <p style="margin:0;font-size:12px;color:#6A6D76;line-height:1.6;text-align:center;">Recovered estimate is directional &mdash; the real attribution-backed metric will replace it on your dashboard once analytics catches up. <a href="https://www.recall-touch.com/app/settings/notifications" style="color:#2563EB;text-decoration:none;">Update preferences</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
      log("error", "[cron/weekly-digest] Failed to send digest for workspace", { error: err instanceof Error ? err.message : String(err) });
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, errors });
}
