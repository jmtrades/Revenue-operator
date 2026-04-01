/**
 * "Your AI agent is live" email — sent after onboarding/workspace is saved and agent is ready.
 */

import { getDb } from "@/lib/db/queries";

import { getBaseUrl } from "@/lib/runtime/base-url";

const FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
const APP_URL = getBaseUrl();

export async function sendAgentLiveEmail(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("owner_id, name")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws) return false;

  const { data: user } = await db
    .from("users")
    .select("email")
    .eq("id", (ws as { owner_id: string }).owner_id)
    .maybeSingle();
  const email = (user as { email?: string } | null)?.email;
  if (!email) return false;

  const businessName = (ws as { name?: string }).name ?? "Your business";
  const subject = "Your AI operator is live";
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
  <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Your AI operator is live</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;line-height:1.6;">Your Revenue Operator AI operator for <strong>${escapeHtml(businessName)}</strong> is set up and ready.</p>
  <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;line-height:1.6;">Forward your phone number in Settings to start receiving calls, or try the demo anytime.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background-color:#10b981;border-radius:12px;">
    <a href="${APP_URL}/app/dashboard" style="display:inline-block;padding:14px 32px;color:#000000;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">Open dashboard →</a>
  </td></tr>
  </table>
  <p style="margin:0;font-size:14px;color:#e5e5e5;">— Revenue Operator</p>
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
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from: FROM, to: email, subject, html }),
      });
      return res.ok;
    }
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
