/**
 * Team invite email via Resend.
 */

const FROM = process.env.EMAIL_FROM ?? "Revenue Operator <team@revenueoperator.ai>";
const _APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.revenueoperator.ai";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface InviteEmailParams {
  inviterName: string;
  workspaceName: string;
  role: string;
  acceptUrl: string;
}

export function buildInviteEmailHTML(params: InviteEmailParams): string {
  const { inviterName, workspaceName, role, acceptUrl } = params;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Hi there,</p>
  <p><strong>${escapeHtml(inviterName)}</strong> invited you to join <strong>${escapeHtml(workspaceName)}</strong> as a <strong>${escapeHtml(role)}</strong> on Revenue Operator.</p>
  <p>Revenue Operator is an AI calling platform that handles phone calls, books appointments, and captures leads automatically.</p>
  <p style="margin: 28px 0;">
    <a href="${escapeHtml(acceptUrl)}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; font-weight: 600; border-radius: 8px;">Accept invitation →</a>
  </p>
  <p style="font-size: 13px; color: #666;">This invite expires in 7 days. If you didn't expect this, you can ignore it.</p>
  <p style="font-size: 13px; color: #666;">— The Revenue Operator team</p>
</body>
</html>
`.trim();
}

export async function sendInviteEmail(to: string, params: InviteEmailParams): Promise<{ ok: boolean; error?: string }> {
  if (!to || !process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const subject = `${params.inviterName} invited you to ${params.workspaceName} on Revenue Operator`;
  const html = buildInviteEmailHTML(params);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = (data as { message?: string }).message ?? res.statusText;
      return { ok: false, error: err };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email" };
  }
}
