/**
 * Dunning emails — sent on payment failure.
 * Uses branded HTML templates with escalating urgency.
 */

import * as Sentry from "@sentry/nextjs";
import { sendEmail } from "@/lib/integrations/email";
import { buildDunningEmail } from "@/lib/email/templates";
import { log } from "@/lib/logger";

export type DunningAttempt = 1 | 2 | 3 | 4;

function clampAttempt(attempt: number): DunningAttempt {
  if (attempt <= 1) return 1;
  if (attempt === 2) return 2;
  if (attempt === 3) return 3;
  return 4;
}

export async function sendDunningEmail(
  workspaceId: string,
  toEmail: string,
  attempt: number,
  amountDueCents?: number,
  nextRetryAt?: string | null,
): Promise<{ ok: boolean; attemptSent: DunningAttempt }> {
  const clamped = clampAttempt(attempt);

  const amountDue = amountDueCents
    ? `$${(amountDueCents / 100).toFixed(2)}`
    : "your subscription amount";

  const nextRetryDate = nextRetryAt
    ? new Date(nextRetryAt).toLocaleDateString(undefined, { dateStyle: "medium" })
    : undefined;

  const { subject, html } = buildDunningEmail({
    attempt: clamped,
    amountDue,
    nextRetryDate,
  });

  try {
    await sendEmail(workspaceId, toEmail, subject, html);
    return { ok: true, attemptSent: clamped };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "[dunning] sendDunningEmail failed", { workspaceId, toEmail, attempt: clamped, error: msg });
    Sentry.captureException(err);
    return { ok: false, attemptSent: clamped };
  }
}
