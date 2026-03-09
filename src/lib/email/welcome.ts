const FROM = process.env.EMAIL_FROM ?? "Recall Touch <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendWelcomeEmail(email: string, nameOrBusiness?: string | null): Promise<boolean> {
  if (!email) return false;
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping welcome email");
    return false;
  }

  const name = nameOrBusiness?.trim() || "there";
  const subject = "Welcome to Recall Touch — let's set up your AI";
  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Welcome to Recall Touch. Your 14-day free trial is active.</p>
    <p>Here's what to do first:</p>
    <ol style="margin: 1em 0;">
      <li>Tell us about your business (30 seconds)</li>
      <li>Choose your AI voice</li>
      <li>Add a few Q&As your callers might ask</li>
      <li>Test your agent with a real conversation</li>
      <li>Connect your phone number</li>
    </ol>
    <p><a href="${escapeHtml(APP_URL)}/app/onboarding" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; font-weight: 600; border-radius: 8px;">Start setup →</a></p>
    <p>Questions? Reply to this email — a human reads every one.</p>
    <p>— Junior, Founder of Recall Touch</p>
  `;

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
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendGoLiveEmail(email: string, workspaceName?: string | null): Promise<boolean> {
  if (!email) return false;
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping go-live email");
    return false;
  }
  const safeName = workspaceName?.trim() || "Your workspace";
  const subject = "Your first call is in — you're live";
  const html = `
    <p>Hi,</p>
    <p><strong>${escapeHtml(safeName)}</strong> just completed its first call with Recall Touch.</p>
    <p>Check your dashboard for the transcript and outcome. Your AI is now handling calls.</p>
    <p><a href="${APP_URL}/app/activity">Open dashboard →</a></p>
    <p>— Recall Touch</p>
  `;
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
