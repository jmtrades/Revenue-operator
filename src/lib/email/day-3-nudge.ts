/**
 * Day-3 nudge email: "Your AI is waiting for its first call".
 * Builds subject and HTML; sending is done by the cron route.
 */

export function buildDay3NudgeEmail(params: {
  userName: string;
  readinessPct: number;
  appUrl: string;
}): { subject: string; html: string } {
  const { userName, readinessPct, appUrl } = params;
  const subject = "Your AI is waiting for its first call";
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
  <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Your AI is waiting for its first call</h1>
  <p style="margin:0 0 16px;font-size:15px;color:#a3a3a3;line-height:1.6;">Hi ${userName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")},</p>
  <p style="margin:0 0 16px;font-size:15px;color:#a3a3a3;line-height:1.6;">Your Revenue Operator agent is ${readinessPct}% configured but hasn't taken any calls yet.</p>
  <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;line-height:1.6;">The fastest way to see it work: open the Test step in your agent setup and have a conversation with it.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background-color:#10b981;border-radius:12px;">
    <a href="${appUrl}/activate" style="display:inline-block;padding:14px 32px;color:#000000;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">Test your agent →</a>
  </td></tr>
  </table>
  <p style="margin:0;font-size:14px;color:#e5e5e5;">— Junior</p>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#525252;">Revenue Operator Inc. · AI that makes and takes your phone calls</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  return { subject, html };
}
