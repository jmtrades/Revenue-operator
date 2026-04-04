import { getDb } from "@/lib/db/queries";

import { getBaseUrl } from "@/lib/runtime/base-url";

const FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
const APP_URL = getBaseUrl();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendCallOutcomeEmail(input: {
  workspaceId: string;
  callSessionId: string;
  outcome: string;
  summary?: string | null;
  callerPhone?: string | null;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("owner_id, name")
    .eq("id", input.workspaceId)
    .maybeSingle();
  if (!ws) return false;

  const { data: user } = await db
    .from("users")
    .select("email")
    .eq("id", (ws as { owner_id: string }).owner_id)
    .maybeSingle();
  const email = (user as { email?: string } | null)?.email;
  if (!email) return false;

  const workspaceName = (ws as { name?: string | null }).name?.trim() || "Your workspace";
  const outcomeLabel = input.outcome.replace(/_/g, " ");
  const summary = input.summary?.trim() || "A completed call is ready for review.";
  const callerLine = input.callerPhone?.trim() ? `<p style="margin:0 0 16px;font-size:15px;color:#a3a3a3;line-height:1.6;"><strong>Caller:</strong> ${escapeHtml(input.callerPhone.trim())}</p>` : "";
  const subject = `${workspaceName}: ${outcomeLabel}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Revenue Operator</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="padding-bottom:32px;text-align:center;">
  <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Revenue Operator</span>
</td></tr>
<tr><td style="background-color:#141414;border:1px solid #262626;border-radius:16px;padding:40px 32px;">
  <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">New call outcome for ${escapeHtml(workspaceName)}</h1>
  <p style="margin:0 0 16px;font-size:15px;color:#a3a3a3;line-height:1.6;"><strong>Outcome:</strong> ${escapeHtml(outcomeLabel)}</p>
  ${callerLine}
  <p style="margin:0 0 16px;font-size:15px;color:#a3a3a3;line-height:1.6;"><strong>Summary:</strong> ${escapeHtml(summary)}</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background-color:#10b981;border-radius:12px;">
    <a href="${APP_URL}/app/calls/${input.callSessionId}" style="display:inline-block;padding:14px 32px;color:#000000;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">Open call record →</a>
  </td></tr>
  </table>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#525252;">Revenue Operator Inc. · AI that makes and takes your phone calls</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject,
        html: html + `<p style="margin-top:24px;font-size:12px;color:#999;text-align:center;"><a href="${APP_URL}/app/settings/notifications" style="color:#999;">Manage email preferences</a></p>`,
        headers: {
          "List-Unsubscribe": `<${APP_URL}/app/settings/notifications>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
