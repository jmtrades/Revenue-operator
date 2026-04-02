/**
 * Cron: 24-hour renewal reminder.
 * Finds workspaces with renewal within ~24h, sends reminder email.
 * Run hourly, e.g. 0 * * * *
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const _in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const _in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, owner_id, protection_renewal_at, created_at, renewal_reminder_sent_at");

  const toNotify: Array<{ workspaceId: string; ownerEmail: string; renewalAt: string }> = [];

  // Pre-filter eligible workspaces, then batch-fetch owner emails
  const eligible: Array<{ id: string; owner_id: string; renewalAt: Date }> = [];
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
    eligible.push({ id: row.id, owner_id: row.owner_id, renewalAt });
  }

  // Batch-fetch owner emails to avoid N+1
  const ownerIds = [...new Set(eligible.map((e) => e.owner_id))];
  const ownerEmailMap = new Map<string, string>();
  if (ownerIds.length) {
    const { data: ownerRows } = await db.from("users").select("id, email").in("id", ownerIds);
    for (const u of (ownerRows ?? []) as { id: string; email?: string }[]) {
      if (u.email) ownerEmailMap.set(u.id, u.email);
    }
  }

  for (const e of eligible) {
    const email = ownerEmailMap.get(e.owner_id);
    if (!email) continue;
    toNotify.push({
      workspaceId: e.id,
      ownerEmail: email,
      renewalAt: e.renewalAt.toISOString(),
    });
  }

  const results: Array<{ workspaceId: string; email: string; sent: boolean }> = [];

  for (const { workspaceId, ownerEmail, renewalAt: _renewalAt } of toNotify) {
    const subject = "Your billing renews tomorrow";
    const body = `Revenue Operator renews automatically tomorrow.

Your number, call handling, and follow-up coverage will stay active with no interruption.

If you need to pause instead, open billing in the app today.`;

    try {
      if (process.env.RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "Revenue Operator <noreply@recall-touch.com>",
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
        await db.from("workspaces").update({ renewal_reminder_sent_at: new Date().toISOString() }).eq("id", workspaceId);
        results.push({ workspaceId, email: ownerEmail, sent: true });
      }
    } catch (err) {
      // Error response below
      results.push({ workspaceId, email: ownerEmail, sent: false });
    }
  }

  return NextResponse.json({
    ok: true,
    notified: toNotify.length,
    results,
  });
}
