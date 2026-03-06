/**
 * Trial reminder emails: 2 days before and 24 hours before renewal.
 * Idempotent: reuses the existing 3d/24h sent-at fields for compatibility.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Recall Touch <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

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

  // 2 days before renewal
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const twoDaysStart = new Date(twoDaysFromNow.getTime() - 2 * 60 * 60 * 1000);
  const twoDaysEnd = new Date(twoDaysFromNow.getTime() + 2 * 60 * 60 * 1000);

  // 24 hours before renewal
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneDayStart = new Date(oneDayFromNow.getTime() - 2 * 60 * 60 * 1000);
  const oneDayEnd = new Date(oneDayFromNow.getTime() + 2 * 60 * 60 * 1000);

  // Get workspaces needing 2-day reminder
  const { data: workspaces2d } = await db
    .from("workspaces")
    .select("id, owner_id, renews_at, trial_reminder_3d_sent_at")
    .eq("billing_status", "trial")
    .not("renews_at", "is", null)
    .gte("renews_at", twoDaysStart.toISOString())
    .lte("renews_at", twoDaysEnd.toISOString())
    .or("trial_reminder_3d_sent_at.is.null,trial_reminder_3d_sent_at.lt." + twoDaysStart.toISOString());

  // Get workspaces needing 24h reminder
  const { data: workspaces24h } = await db
    .from("workspaces")
    .select("id, owner_id, renews_at, trial_reminder_24h_sent_at")
    .eq("billing_status", "trial")
    .not("renews_at", "is", null)
    .gte("renews_at", oneDayStart.toISOString())
    .lte("renews_at", oneDayEnd.toISOString())
    .or("trial_reminder_24h_sent_at.is.null,trial_reminder_24h_sent_at.lt." + oneDayStart.toISOString());

  let sent2d = 0;
  let sent24h = 0;

  // Send 2-day reminders
  for (const ws of workspaces2d ?? []) {
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
        `Your trial ends in 2 days`,
        `
        <p>Your Recall Touch trial ends on <strong>${renewalDate}</strong>.</p>
        <p>Keep your phone flow live so every call, lead, and appointment keeps moving without interruption.</p>
        <p><a href="${APP_URL}/app/settings/billing">Open billing →</a></p>
        `
      );

      await db
        .from("workspaces")
        .update({ trial_reminder_3d_sent_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", workspaceId);
      sent2d++;
    } catch (error) {
      console.error(`[trial-reminders] Failed to send 2d reminder to ${email}`, error);
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
        `Your trial ends tomorrow`,
        `
        <p>Your Recall Touch trial ends tomorrow, <strong>${renewalDate}</strong>.</p>
        <p>Add billing now to keep your number, follow-up coverage, and booking flow active.</p>
        <p><a href="${APP_URL}/app/settings/billing">Keep coverage active →</a></p>
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
    sent_2d: sent2d,
    sent_3d: sent2d,
    sent_24h: sent24h,
    checked_at: now.toISOString(),
  });
}
