/**
 * Cron: 24-hour renewal reminder.
 * Finds workspaces with renewal within ~24h, sends reminder email.
 * Run hourly, e.g. 0 * * * *
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getDb();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, owner_id, protection_renewal_at, created_at, renewal_reminder_sent_at");

  const toNotify: Array<{ workspaceId: string; ownerEmail: string; renewalAt: string }> = [];

  for (const ws of workspaces ?? []) {
    const row = ws as { id: string; owner_id: string; protection_renewal_at?: string | null; created_at?: string; renewal_reminder_sent_at?: string | null };
    let renewalAt: Date;
    if (row.protection_renewal_at) {
      renewalAt = new Date(row.protection_renewal_at);
    } else if (row.created_at) {
      renewalAt = new Date(row.created_at);
      renewalAt.setDate(renewalAt.getDate() + 14);
    } else continue;

    const ms = renewalAt.getTime() - now.getTime();
    const hoursUntil = ms / (60 * 60 * 1000);
    if (hoursUntil > 25 || hoursUntil < 23) continue;
    if (row.renewal_reminder_sent_at) continue;

    const { data: user } = await db.from("users").select("email").eq("id", row.owner_id).single();
    const email = (user as { email?: string } | null)?.email;
    if (!email) continue;

    toNotify.push({
      workspaceId: row.id,
      ownerEmail: email,
      renewalAt: renewalAt.toISOString(),
    });
  }

  const results: Array<{ workspaceId: string; email: string; sent: boolean }> = [];

  for (const { workspaceId, ownerEmail, renewalAt } of toNotify) {
    const subject = "Protection is continuing — nothing will be interrupted";
    const body = `Protection is continuing automatically tomorrow. Nothing will be interrupted.

All conversations will keep being maintained. You only take the calls.

To pause protection instead, open Preferences in the overview.`;

    try {
      if (process.env.RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "Revenue Operator <noreply@revenue-operator.com>",
            to: ownerEmail,
            subject,
            text: body,
          }),
        });
        if (res.ok) {
          await db.from("workspaces").update({ renewal_reminder_sent_at: new Date().toISOString() }).eq("id", workspaceId);
          results.push({ workspaceId, email: ownerEmail, sent: true });
        } else {
          results.push({ workspaceId, email: ownerEmail, sent: false });
        }
      } else {
        console.log("[renewal-reminder] Would send to", ownerEmail, "renewal at", renewalAt);
        await db.from("workspaces").update({ renewal_reminder_sent_at: new Date().toISOString() }).eq("id", workspaceId);
        results.push({ workspaceId, email: ownerEmail, sent: true });
      }
    } catch (err) {
      console.error("[renewal-reminder]", err);
      results.push({ workspaceId, email: ownerEmail, sent: false });
    }
  }

  return NextResponse.json({
    ok: true,
    notified: toNotify.length,
    results,
  });
}
