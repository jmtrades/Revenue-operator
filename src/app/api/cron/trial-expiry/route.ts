/**
 * Trial expiry enforcement:
 * - On/after `trial_ends_at`: mark workspace `trial_expired` for a 3-day grace window (keeps calls answered)
 * - After grace (6 total days since trial_ends_at): mark workspace `expired` and billing_status `trial_ended`
 * - Send a "trial ended" email when transitioning trial_expired -> expired
 *
 * Intended to run daily via Vercel Cron.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) return;

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
      signal: AbortSignal.timeout(10_000),
    }),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => "Resend error");
    throw new Error(`Resend API error: ${error}`);
  }
}

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const nowMs = now.getTime();

  // Find candidates for trial-expiry transitions.
  const { data: trialStateCandidates } = await db
    .from("workspaces")
    .select("id, owner_id, trial_ends_at, status, pause_reason, billing_status")
    .limit(500);

  let graceStarted = 0;
  let expiredSet = 0;

  for (const row of trialStateCandidates ?? []) {
    const ws = row as {
      id: string;
      owner_id: string;
      trial_ends_at?: string | null;
      status?: string | null;
      pause_reason?: string | null;
      billing_status?: string | null;
    };

    if (!ws.owner_id) continue;
    if (ws.pause_reason) continue;
    if (ws.status === "paused") continue;

    const trialEndMs = ws.trial_ends_at ? new Date(ws.trial_ends_at).getTime() : null;
    if (!trialEndMs || Number.isNaN(trialEndMs)) continue;

    const inGraceWindow = nowMs >= trialEndMs && nowMs < trialEndMs + GRACE_MS;
    const pastGraceWindow = nowMs >= trialEndMs + GRACE_MS;

    const isActiveBilling = ws.billing_status === "active";

    if (ws.status === "trial_expired") {
      if (pastGraceWindow && !isActiveBilling) {
        const ownerId = ws.owner_id;
        const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
        const email = (user as { email?: string } | null)?.email;

        await db
          .from("workspaces")
          .update({ status: "expired", billing_status: "trial_ended", updated_at: now.toISOString() })
          .eq("id", ws.id);

        await db
          .from("workspace_billing")
          .update({ plan: "trial_ended", status: "trial_ended" })
          .eq("workspace_id", ws.id);

        if (email) {
          void sendEmail(
            email,
            "Reactivate your Revenue Operator trial",
            `<p>Your Revenue Operator trial has ended.</p>
             <p>You can restore service by upgrading your billing.</p>
             <p><a href="${APP_URL}/app/settings/billing">Upgrade to continue →</a></p>`,
          ).catch((err) => {
            // Error (details omitted to protect PII)
          });
        }

        expiredSet++;
      }
      continue;
    }

    if (ws.status !== "trial_expired" && ws.status !== "expired") {
      if (inGraceWindow && !isActiveBilling) {
        await db.from("workspaces").update({ status: "trial_expired", updated_at: now.toISOString() }).eq("id", ws.id);
        graceStarted++;
      }
    }
  }

  return NextResponse.json({
    grace_started: graceStarted,
    expired_set: expiredSet,
    checked_at: now.toISOString(),
  });
}

