/**
 * Trial reminder emails: 3 days before and 24 hours before renewal
 * Idempotent: uses trial_reminder_3d_sent_at and trial_reminder_24h_sent_at fields
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Continuity <noreply@recall-touch.com>";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[trial-reminders] RESEND_API_KEY not set, skipping email");
    return;
  }

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
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }
}

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();

  // 3 days before renewal
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const threeDaysStart = new Date(threeDaysFromNow.getTime() - 2 * 60 * 60 * 1000); // 2 hour window
  const threeDaysEnd = new Date(threeDaysFromNow.getTime() + 2 * 60 * 60 * 1000);

  // 24 hours before renewal
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneDayStart = new Date(oneDayFromNow.getTime() - 2 * 60 * 60 * 1000);
  const oneDayEnd = new Date(oneDayFromNow.getTime() + 2 * 60 * 60 * 1000);

  // Get workspaces needing 3-day reminder
  const { data: workspaces3d } = await db
    .from("workspaces")
    .select("id, owner_id, renews_at, trial_reminder_3d_sent_at")
    .eq("billing_status", "trial")
    .not("renews_at", "is", null)
    .gte("renews_at", threeDaysStart.toISOString())
    .lte("renews_at", threeDaysEnd.toISOString())
    .or("trial_reminder_3d_sent_at.is.null,trial_reminder_3d_sent_at.lt." + threeDaysStart.toISOString());

  // Get workspaces needing 24h reminder
  const { data: workspaces24h } = await db
    .from("workspaces")
    .select("id, owner_id, renews_at, trial_reminder_24h_sent_at")
    .eq("billing_status", "trial")
    .not("renews_at", "is", null)
    .gte("renews_at", oneDayStart.toISOString())
    .lte("renews_at", oneDayEnd.toISOString())
    .or("trial_reminder_24h_sent_at.is.null,trial_reminder_24h_sent_at.lt." + oneDayStart.toISOString());

  let sent3d = 0;
  let sent24h = 0;

  // Send 3-day reminders
  for (const ws of workspaces3d ?? []) {
    const workspaceId = (ws as { id: string }).id;
    const ownerId = (ws as { owner_id?: string }).owner_id;
    const renewsAt = (ws as { renews_at?: string }).renews_at;

    if (!ownerId || !renewsAt) continue;

    const { data: user } = await db.from("users").select("email").eq("id", ownerId).single();
    const email = (user as { email?: string })?.email;
    if (!email) continue;

    const renewalDate = new Date(renewsAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    try {
      await sendEmail(
        email,
        `Handling coverage ends on ${renewalDate}`,
        `
        <p>Handling coverage ends on ${renewalDate}.</p>
        <p>To continue coverage, open Preferences. You can pause anytime before then.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://recall-touch.com"}/dashboard/settings">Preferences</a></p>
        `
      );

      await db
        .from("workspaces")
        .update({ trial_reminder_3d_sent_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", workspaceId);
      sent3d++;
    } catch (error) {
      console.error(`[trial-reminders] Failed to send 3d reminder to ${email}`, error);
    }
  }

  // Send 24h reminders
  for (const ws of workspaces24h ?? []) {
    const workspaceId = (ws as { id: string }).id;
    const ownerId = (ws as { owner_id?: string }).owner_id;
    const renewsAt = (ws as { renews_at?: string }).renews_at;

    if (!ownerId || !renewsAt) continue;

    const { data: user } = await db.from("users").select("email").eq("id", ownerId).single();
    const email = (user as { email?: string })?.email;
    if (!email) continue;

    const renewalDate = new Date(renewsAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    try {
      await sendEmail(
        email,
        `Handling coverage ends on ${renewalDate}`,
        `
        <p>Handling coverage ends tomorrow (${renewalDate}).</p>
        <p>To continue coverage, open Preferences. You can pause anytime before then.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://recall-touch.com"}/dashboard/settings">Preferences</a></p>
        `
      );

      await db
        .from("workspaces")
        .update({ trial_reminder_24h_sent_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", workspaceId);
      sent24h++;
    } catch (error) {
      console.error(`[trial-reminders] Failed to send 24h reminder to ${email}`, error);
    }
  }

  return NextResponse.json({
    sent_3d: sent3d,
    sent_24h: sent24h,
    checked_at: now.toISOString(),
  });
}
