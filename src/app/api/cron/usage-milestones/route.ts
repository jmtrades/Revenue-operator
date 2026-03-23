/**
 * Cron: Send usage milestone celebration emails.
 * Runs daily. Finds workspaces that have crossed 1, 10, 50, 100, or 500 calls
 * since last check and sends a branded celebration email.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { buildMilestoneEmail } from "@/lib/email/templates";
import { log } from "@/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "Recall Touch <noreply@recall-touch.com>";

const MILESTONES = [1, 10, 50, 100, 500];

// Rough estimate: each call saves ~$5 in missed revenue/opportunity cost
const REVENUE_PER_CALL = 5;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_resend_key" });
  }

  const db = getDb();

  // Get all active workspaces
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, name, owner_id")
    .in("status", ["active", "trial"])
    .limit(500);

  if (!workspaces || workspaces.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No active workspaces" });
  }

  let sent = 0;
  let errors = 0;

  for (const ws of workspaces as Array<{ id: string; name?: string; owner_id?: string }>) {
    try {
      if (!ws.owner_id) continue;

      // Count total completed calls for this workspace
      const { count: totalCalls } = await db
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws.id)
        .not("call_ended_at", "is", null);

      const callCount = totalCalls ?? 0;
      if (callCount === 0) continue;

      // Find the highest milestone crossed
      const crossedMilestones = MILESTONES.filter((m) => callCount >= m);
      if (crossedMilestones.length === 0) continue;

      const highestMilestone = crossedMilestones[crossedMilestones.length - 1];

      // Check if we already sent this milestone email
      const milestoneSlug = `milestone_${highestMilestone}`;
      const { data: alreadySent } = await db
        .from("email_send_queue")
        .select("id")
        .eq("workspace_id", ws.id)
        .eq("template_slug", milestoneSlug)
        .limit(1)
        .maybeSingle();

      if (alreadySent) continue;

      // Get owner email
      const { data: user } = await db
        .from("users")
        .select("email, full_name")
        .eq("id", ws.owner_id)
        .maybeSingle();

      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const userName = (user as { full_name?: string } | null)?.full_name ?? ws.name ?? "there";

      const { subject, html } = buildMilestoneEmail({
        name: userName,
        milestone: highestMilestone,
        totalCalls: callCount,
        estimatedRevenueSaved: callCount * REVENUE_PER_CALL,
      });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from: FROM, to: email, subject, html }),
      });

      if (res.ok) {
        await db.from("email_send_queue").insert({
          workspace_id: ws.id,
          to_email: email,
          subject,
          body_html: html,
          template_slug: milestoneSlug,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
        sent++;
      } else {
        errors++;
      }
    } catch (err) {
      log("error", "[cron/usage-milestones] Failed for workspace", {
        workspace_id: ws.id,
        error: err instanceof Error ? err.message : String(err),
      });
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, errors, checked: workspaces.length });
}
