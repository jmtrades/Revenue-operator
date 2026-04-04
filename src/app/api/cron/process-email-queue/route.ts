/**
 * Cron: Retry failed emails from email_send_queue.
 * Runs every 5 minutes. Picks up failed emails with retry_count < 5 and
 * retries them with exponential backoff via Resend API.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertCronAuthorized } from "@/lib/runtime";
import { log } from "@/lib/logger";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 60_000; // 1 minute base delay

function getRetryDelayMs(retryCount: number): number {
  return BASE_DELAY_MS * Math.pow(2, Math.min(retryCount, 4)); // 1m, 2m, 4m, 8m, 16m
}

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  let retried = 0;
  let succeeded = 0;
  let permanentlyFailed = 0;

  try {
    const now = new Date();

    // Fetch failed emails that are eligible for retry
    const { data: failedEmails } = await db
      .from("email_send_queue")
      .select("id, workspace_id, to_email, subject, body_html, retry_count, template_slug, created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: true })
      .limit(20);

    const emails = (failedEmails ?? []) as Array<{
      id: string;
      workspace_id: string;
      to_email: string;
      subject: string;
      body_html: string;
      retry_count?: number;
      template_slug?: string | null;
      created_at: string;
    }>;

    if (emails.length === 0) {
      return NextResponse.json({ ok: true, retried: 0, succeeded: 0, permanently_failed: 0 });
    }

    for (const email of emails) {
      const retryCount = email.retry_count ?? 0;

      // Check if max retries exceeded
      if (retryCount >= MAX_RETRIES) {
        await db
          .from("email_send_queue")
          .update({ status: "permanently_failed", updated_at: now.toISOString() })
          .eq("id", email.id);
        permanentlyFailed++;
        continue;
      }

      // Check if enough time has passed since last attempt (exponential backoff)
      const requiredDelay = getRetryDelayMs(retryCount);
      const emailCreated = new Date(email.created_at).getTime();
      const minRetryAt = emailCreated + requiredDelay * (retryCount + 1);
      if (now.getTime() < minRetryAt) {
        continue; // Not yet time to retry
      }

      // Get workspace email config (Resend API key)
      let apiKey = process.env.RESEND_API_KEY;

      // Try workspace-specific key
      try {
        const { data: configRow } = await db
          .from("integration_configs")
          .select("config")
          .eq("workspace_id", email.workspace_id)
          .eq("provider", "resend")
          .maybeSingle();
        const config = configRow as { config?: { api_key?: string } } | null;
        if (config?.config?.api_key) {
          apiKey = config.config.api_key;
        }
      } catch {
        // Fall back to env var
      }

      if (!apiKey) {
        log("warn", "email_retry.no_api_key", { email_id: email.id, workspace_id: email.workspace_id });
        continue;
      }

      // Attempt to resend
      try {
        const fromEmail = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email.to_email],
            subject: email.subject,
            html: email.body_html,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        const json = (await res.json()) as { id?: string; message?: string };

        if (res.ok && json.id) {
          await db
            .from("email_send_queue")
            .update({
              status: "sent",
              external_id: json.id,
              sent_at: now.toISOString(),
              retry_count: retryCount + 1,
              updated_at: now.toISOString(),
            })
            .eq("id", email.id);
          succeeded++;
        } else {
          const errMsg = json.message ?? res.statusText ?? "Retry failed";
          await db
            .from("email_send_queue")
            .update({
              status: "failed",
              error_message: errMsg,
              retry_count: retryCount + 1,
              updated_at: now.toISOString(),
            })
            .eq("id", email.id);
        }
        retried++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await db
          .from("email_send_queue")
          .update({
            status: "failed",
            error_message: errMsg,
            retry_count: retryCount + 1,
            updated_at: now.toISOString(),
          })
          .eq("id", email.id);
        retried++;
      }
    }

    log("info", "cron.email_queue", { retried, succeeded, permanently_failed: permanentlyFailed });
    return NextResponse.json({ ok: true, retried, succeeded, permanently_failed: permanentlyFailed });
  } catch (err) {
    log("error", "cron.email_queue.failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
