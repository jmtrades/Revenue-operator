/**
 * First-day check cron: Send email if user signed up >12 hours ago and has 0 conversations
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Recall Touch <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
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
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();

  // Find workspaces created >4 hours ago, onboarding not completed, first-day email not sent
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data: workspaces, error } = await db
    .from("workspaces")
    .select(`
      id,
      owner_id,
      created_at,
      first_day_email_sent_at,
      onboarding_completed_at,
      users!workspaces_owner_id_fkey (
        email
      )
    `)
    .lt("created_at", fourHoursAgo)
    .is("first_day_email_sent_at", null);

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const results: Array<{ workspaceId: string; email: string; sent: boolean }> = [];

  for (const ws of workspaces || []) {
    const workspaceId = (ws as { id: string }).id;
    const _ownerId = (ws as { owner_id: string }).owner_id;
    const user = (ws as { users?: { email?: string } | null })?.users;
    const email = user && typeof user === "object" && "email" in user ? user.email : null;

    if (!email) {
      continue;
    }

    // Skip if onboarding already completed (workspace has onboarding_completed_at)
    const wsRow = ws as { onboarding_completed_at?: string } | null;
    if (wsRow?.onboarding_completed_at) continue;

    // Check conversation count — if they have calls, skip
    const { count } = await db
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (count && count > 0) continue;

    const userName = (email as string).split("@")[0]?.replace(/[._-]/g, " ") || "there";
    const subject = "Quick question — did you get stuck?";
    const body = `Hi ${userName},

I noticed you signed up but haven't finished setting up your AI agent yet.

If something was confusing or didn't work, reply to this email and I'll help personally.

If you're just busy, no worries — your trial doesn't start counting until you make your first call.

Continue setup: ${APP_URL}/app/onboarding

— Junior`;

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
