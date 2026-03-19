import * as Sentry from "@sentry/nextjs";
import { sendEmail } from "@/lib/integrations/email";
import { log } from "@/lib/logger";

export type DunningAttempt = 1 | 2 | 3 | 4;

const DUNNING_TEMPLATES: Record<
  DunningAttempt,
  {
    subject: string;
    bodyHtml: string;
  }
> = {
  1: {
    subject: "Payment failed. Update method.",
    bodyHtml: `
      <p>Your payment failed.</p>
      <p>Update your payment method to continue service.</p>
    `,
  },
  2: {
    subject: "Second attempt failed. Service pauses soon.",
    bodyHtml: `
      <p>Your second payment attempt failed.</p>
      <p>Update your payment method to avoid a service pause soon.</p>
    `,
  },
  3: {
    subject: "Final notice.",
    bodyHtml: `
      <p>We couldn’t process your payment on the third attempt.</p>
      <p>Update your payment method to keep your AI running.</p>
    `,
  },
  4: {
    subject: "Fourth failure. Service is scheduled to pause.",
    bodyHtml: `
      <p>This is the fourth payment failure.</p>
      <p>You still have a short grace window to update payment and keep service running.</p>
    `,
  },
};

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
): Promise<{ ok: boolean; attemptSent: DunningAttempt }> {
  const clamped = clampAttempt(attempt);
  const template = DUNNING_TEMPLATES[clamped];

  try {
    await sendEmail(workspaceId, toEmail, template.subject, template.bodyHtml);
    return { ok: true, attemptSent: clamped };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "[dunning] sendDunningEmail failed", { workspaceId, toEmail, attempt: clamped, error: msg });
    Sentry.captureException(err);
    return { ok: false, attemptSent: clamped };
  }
}

