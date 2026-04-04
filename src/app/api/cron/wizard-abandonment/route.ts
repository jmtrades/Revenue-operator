/**
 * Cron: Wizard Abandonment Recovery
 * Runs hourly. Detects users who started the activation wizard but
 * haven't completed it in 24+ hours. Sends a recovery email.
 *
 * Schedule: Every hour
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { sendEmail } from "@/lib/integrations/email";
import { log } from "@/lib/logger";
import { assertCronAuthorized } from "@/lib/runtime";

const ABANDONMENT_THRESHOLD_HOURS = 24;
const MAX_RECOVERY_EMAILS = 2; // Don't spam — max 2 recovery attempts

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const startMs = Date.now();

  try {
    const db = getDb();

    // Find workspaces that started onboarding but haven't completed it
    // and haven't received too many recovery emails yet
    const cutoff = new Date(Date.now() - ABANDONMENT_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();

    const { data: abandoned } = await db
      .from("workspaces")
      .select("id, name, owner_email, metadata, created_at")
      .eq("onboarding_complete", false)
      .lt("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(50);

    const workspaces = (abandoned ?? []) as Array<{
      id: string;
      name?: string;
      owner_email?: string;
      metadata?: Record<string, unknown>;
      created_at: string;
    }>;

    let sent = 0;
    let skipped = 0;

    for (const ws of workspaces) {
      if (!ws.owner_email) {
        skipped++;
        continue;
      }

      const meta = ws.metadata ?? {};
      const recoveryCount = (meta.wizard_recovery_emails_sent as number) || 0;

      if (recoveryCount >= MAX_RECOVERY_EMAILS) {
        skipped++;
        continue;
      }

      // Determine which step they stopped at
      const lastStep = (meta.onboarding_last_step as string) || "unknown";
      const progressPercent = (meta.onboarding_progress as number) || 0;

      try {
        const ownerName = ws.name || "there";
        const subject = recoveryCount === 0
          ? `Your AI operator is almost ready, ${ownerName}!`
          : `Still want to set up your AI operator, ${ownerName}?`;

        const bodyHtml = buildRecoveryEmail(ownerName, lastStep, progressPercent, recoveryCount);

        const result = await sendEmail(ws.id, ws.owner_email, subject, bodyHtml, {
          template_slug: "wizard_abandonment_recovery",
        });

        if (result.ok) {
          // Update recovery count in metadata
          await db
            .from("workspaces")
            .update({
              metadata: {
                ...meta,
                wizard_recovery_emails_sent: recoveryCount + 1,
                wizard_last_recovery_at: new Date().toISOString(),
              },
            })
            .eq("id", ws.id);

          sent++;
          log("info", "cron.wizard_abandonment.sent", {
            workspaceId: ws.id,
            email: ws.owner_email,
            attempt: recoveryCount + 1,
          });
        }
      } catch (emailErr) {
        log("warn", "cron.wizard_abandonment.email_failed", {
          workspaceId: ws.id,
          error: emailErr instanceof Error ? emailErr.message : String(emailErr),
        });
      }
    }

    const durationMs = Date.now() - startMs;
    log("info", "cron.wizard_abandonment.completed", {
      checked: workspaces.length,
      sent,
      skipped,
      durationMs,
    });

    return NextResponse.json({
      ok: true,
      checked: workspaces.length,
      sent,
      skipped,
      durationMs,
    });
  } catch (err) {
    log("error", "cron.wizard_abandonment.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

function buildRecoveryEmail(
  name: string,
  lastStep: string,
  progressPercent: number,
  attempt: number,
): string {
  const signupLink = "https://www.recall-touch.com/activate";

  const progressBar = progressPercent > 0
    ? `<div style="background:#e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        <div style="background:#2563EB;height:8px;width:${Math.min(95, progressPercent)}%;border-radius:8px;"></div>
       </div>
       <p style="font-size:14px;color:#6b7280;margin-top:4px;">You're ${Math.min(95, progressPercent)}% there!</p>`
    : "";

  const stepHint = lastStep !== "unknown"
    ? `<p>You were working on the <strong>${lastStep}</strong> step — your progress is saved and waiting for you.</p>`
    : `<p>Your account is set up and ready — you just need to finish configuring your AI operator.</p>`;

  const urgencyNote = attempt === 0
    ? `<p>Every missed call is a potential customer calling your competitor instead. Let's fix that today.</p>`
    : `<p>Your free trial clock is ticking — make the most of it by getting your AI agent live.</p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hey ${name},</p>
  <p>I noticed you started setting up your Revenue Operator AI operator but didn't quite finish. No worries — it happens!</p>
  ${progressBar}
  ${stepHint}
  ${urgencyNote}
  <p>The whole setup takes about 10-15 minutes, and then your AI operator starts answering calls immediately.</p>
  <p><a href="${signupLink}" style="display:inline-block;padding:14px 28px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Finish Setup Now</a></p>
  <p style="margin-top:20px;">Need help? Just reply to this email — a real human will get back to you within the hour.</p>
  <p>Cheers,<br><strong>The Revenue Operator Team</strong></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
  <p style="font-size:12px;color:#9ca3af;">Revenue Operator Inc. | <a href="https://www.recall-touch.com" style="color:#2563EB;">recall-touch.com</a></p>
  <p style="font-size:11px;color:#9ca3af;"><a href="https://www.recall-touch.com/app/settings/notifications" style="color:#9ca3af;">Manage email preferences</a> | <a href="https://www.recall-touch.com/privacy" style="color:#9ca3af;">Privacy Policy</a></p>
</body>
</html>`;
}
