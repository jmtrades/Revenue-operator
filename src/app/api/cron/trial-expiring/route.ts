/**
 * Cron: Send trial-expiring emails.
 * Runs daily. Finds workspaces whose trial ends in 2 days or 1 day.
 * Sends branded email with usage stats and upgrade CTA.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { buildTrialExpiringEmail } from "@/lib/email/templates";
import { log } from "@/lib/logger";
import { assertCronAuthorized } from "@/lib/runtime";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  if (!RESEND_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_resend_key" });
  }

  const db = getDb();
  const now = new Date();

  // Find workspaces whose trial ends in 1 or 2 days
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  const { data: expiring } = await db
    .from("workspaces")
    .select("id, name, owner_id, billing_tier, trial_ends_at, billing_status")
    .in("billing_status", ["trial"])
    .gte("trial_ends_at", oneDayFromNow.toISOString())
    .lte("trial_ends_at", twoDaysFromNow.toISOString())
    .limit(200);

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No expiring trials" });
  }

  let sent = 0;
  let errors = 0;

  for (const ws of expiring as Array<{
    id: string;
    name?: string;
    owner_id?: string;
    billing_tier?: string;
    trial_ends_at?: string;
  }>) {
    try {
      // Get owner email
      if (!ws.owner_id) continue;
      const { data: user } = await db.from("users").select("email, full_name").eq("id", ws.owner_id).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const userName = (user as { full_name?: string } | null)?.full_name ?? ws.name ?? "there";

      // Calculate days left
      const trialEnd = ws.trial_ends_at ? new Date(ws.trial_ends_at) : twoDaysFromNow;
      const daysLeft = Math.max(1, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000));

      // Get usage stats
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: sessions } = await db
        .from("call_sessions")
        .select("call_started_at, call_ended_at")
        .eq("workspace_id", ws.id)
        .gte("call_started_at", startOfMonth.toISOString());

      const callsHandled = sessions?.length ?? 0;
      const minutesSaved = Math.ceil(
        (sessions ?? []).reduce((sum: number, s: { call_started_at: string; call_ended_at?: string | null }) => {
          const start = new Date(s.call_started_at).getTime();
          const end = s.call_ended_at ? new Date(s.call_ended_at).getTime() : start;
          return sum + (end - start) / 60000;
        }, 0),
      );

      const { count: leadsCount } = await db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws.id);

      const { subject, html } = buildTrialExpiringEmail({
        name: userName,
        daysLeft,
        callsHandled,
        minutesSaved,
        leadsCapture: leadsCount ?? 0,
        tier: ws.billing_tier ?? "solo",
      });

      // Check if we already sent a trial-expiring email for this workspace
      const { data: alreadySent } = await db
        .from("email_send_queue")
        .select("id")
        .eq("workspace_id", ws.id)
        .eq("metadata->>template_slug", "trial_expiring")
        .limit(1)
        .maybeSingle();

      if (alreadySent) continue; // Already sent

      // Send via Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from: FROM, to: email, subject, html }),
      });

      if (res.ok) {
        // Track in queue for dedup
        await db.from("email_send_queue").insert({
          workspace_id: ws.id,
          to_email: email,
          subject,
          html_body: html,
          metadata: { template_slug: "trial_expiring" },
          status: "sent",
          sent_at: new Date().toISOString(),
        });
        sent++;
      } else {
        errors++;
      }
    } catch (err) {
      log("error", "[cron/trial-expiring] Failed for workspace", {
        workspace_id: ws.id,
        error: err instanceof Error ? err.message : String(err),
      });
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, errors, checked: expiring.length });
}
