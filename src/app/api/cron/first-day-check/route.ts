/**
 * First-day check cron: Send email if user signed up >12 hours ago and has 0 conversations
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@revenue-operator.com>";

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[first-day-check] RESEND_API_KEY not set, skipping email");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        text,
      }),
    });

    return res.ok;
  } catch (error) {
    console.error("[first-day-check] Email send failed", error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  // Find workspaces created >12 hours ago, no conversations, email not sent
  const { data: workspaces, error } = await db
    .from("workspaces")
    .select(`
      id,
      owner_id,
      created_at,
      first_day_email_sent_at,
      users!workspaces_owner_id_fkey (
        email
      )
    `)
    .lt("created_at", twelveHoursAgo)
    .is("first_day_email_sent_at", null)
    .eq("billing_status", "trial");

  if (error) {
    console.error("[first-day-check] Query error", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const results: Array<{ workspaceId: string; email: string; sent: boolean }> = [];

  for (const ws of workspaces || []) {
    const workspaceId = (ws as { id: string }).id;
    const _ownerId = (ws as { owner_id: string }).owner_id;
    const user = (ws as { users?: { email?: string } | null })?.users;
    const email = user && typeof user === "object" && "email" in user ? user.email : null;

    if (!email) {
      console.warn(`[first-day-check] No email for workspace ${workspaceId}`);
      continue;
    }

    // Check conversation count
    const { count } = await db
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if (count && count > 0) {
      // Has conversations, skip
      continue;
    }

    // Send email
    const subject = "Your line is ready";
    const body = `If someone messages today they'll get an instant reply.
You don't need to open the app — just leave it active.`;

    const sent = await sendEmail(email, subject, body);

    if (sent) {
      // Mark as sent
      await db
        .from("workspaces")
        .update({ first_day_email_sent_at: new Date().toISOString() })
        .eq("id", workspaceId);
    }

    results.push({ workspaceId, email, sent });
  }

  return NextResponse.json({
    ok: true,
    checked: workspaces?.length || 0,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
