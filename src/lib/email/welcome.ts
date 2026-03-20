/**
 * Welcome email — sent on signup.
 * Uses the branded template system for professional HTML emails.
 */

import { buildWelcomeEmail } from "@/lib/email/templates";

const FROM = process.env.EMAIL_FROM ?? "Recall Touch <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

export async function sendWelcomeEmail(email: string, nameOrBusiness?: string | null): Promise<boolean> {
  if (!email) return false;
  if (!process.env.RESEND_API_KEY) return false;

  const { subject, html } = buildWelcomeEmail(nameOrBusiness ?? "there");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to: email, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendGoLiveEmail(email: string, workspaceName?: string | null): Promise<boolean> {
  if (!email) return false;
  if (!process.env.RESEND_API_KEY) return false;

  const safeName = workspaceName?.trim() || "Your workspace";
  const subject = "Your AI agent is live — first call is in!";
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="padding-bottom:32px;text-align:center;">
  <span style="font-size:20px;font-weight:700;color:#fff;">Recall Touch</span>
</td></tr>
<tr><td style="background:#141414;border:1px solid #262626;border-radius:16px;padding:40px 32px;">
  <div style="text-align:center;margin-bottom:16px;"><span style="font-size:48px;">🎉</span></div>
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#fff;text-align:center;">You're live!</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;text-align:center;line-height:1.6;">
    <strong style="color:#fff;">${safeName}</strong> just completed its first call with Recall Touch. Your AI agent is now handling calls 24/7.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
  <tr><td style="background:#10b981;border-radius:12px;">
    <a href="${APP_URL}/app/activity" style="display:inline-block;padding:14px 32px;color:#000;font-size:15px;font-weight:700;text-decoration:none;">View Call Activity →</a>
  </td></tr>
  </table>
  <p style="margin:0;font-size:14px;color:#e5e5e5;">— Junior, Founder of Recall Touch</p>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#525252;">Recall Touch Inc. · AI that makes and takes your phone calls</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to: email, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
