/**
 * Day 3 nudge: Send "Your AI is waiting for its first call" if signed up 3+ days ago, no calls yet.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { buildDay3NudgeEmail } from "@/lib/email/day-3-nudge";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const unsubscribeUrl = `${APP_URL}/app/settings/notifications`;
  const htmlWithFooter = `${html}<p style="margin-top:24px;font-size:12px;color:#999;text-align:center;"><a href="${unsubscribeUrl}" style="color:#999;">Manage email preferences</a></p>`;
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
        html: htmlWithFooter,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
      signal: AbortSignal.timeout(10_000),
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
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: workspaces, error } = await db
    .from("workspaces")
    .select(`
      id,
      owner_id,
      name,
      knowledge_items,
      agent_name,
      day_3_email_sent_at,
      users!workspaces_owner_id_fkey ( email )
    `)
    .lt("created_at", threeDaysAgo)
    .is("day_3_email_sent_at", null);

  if (error) {
    // Error response below
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const results: Array<{ workspaceId: string; sent: boolean }> = [];

  for (const ws of workspaces || []) {
    const workspaceId = (ws as { id: string }).id;
    const user = (ws as { users?: { email?: string } | null })?.users;
    const email = user && typeof user === "object" && "email" in user ? (user as { email: string }).email : null;
    if (!email) continue;

    const { count } = await db
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (count && count > 0) continue;

    const knowledgeItems = (ws as { knowledge_items?: unknown }).knowledge_items;
    const itemCount = Array.isArray(knowledgeItems) ? knowledgeItems.length : 0;
    const hasAgent = !!(ws as { agent_name?: string }).agent_name?.trim();
    const readinessPct = hasAgent && itemCount >= 3 ? 85 : hasAgent ? 60 : 40;
    const userName = (email as string).split("@")[0]?.replace(/[._-]/g, " ") || "there";
    const { subject, html } = buildDay3NudgeEmail({ userName, readinessPct, appUrl: APP_URL });
    const sent = await sendEmail(email, subject, html);
    if (sent) {
      await db.from("workspaces").update({ day_3_email_sent_at: new Date().toISOString() }).eq("id", workspaceId);
    }
    results.push({ workspaceId, sent });
  }

  return NextResponse.json({
    ok: true,
    checked: workspaces?.length || 0,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
