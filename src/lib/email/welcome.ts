const FROM = process.env.EMAIL_FROM ?? "Recall Touch <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendWelcomeEmail(email: string, businessName?: string | null): Promise<boolean> {
  if (!email || !process.env.RESEND_API_KEY) return false;

  const safeBusinessName = businessName?.trim() || "your business";
  const subject = "Welcome to Recall Touch";
  const html = `
    <p>Hi,</p>
    <p>Your Recall Touch workspace for <strong>${escapeHtml(safeBusinessName)}</strong> is ready.</p>
    <p>Next: finish onboarding, test your phone flow, and connect your number when you're ready to take calls.</p>
    <p><a href="${APP_URL}/app/onboarding">Finish setup →</a></p>
    <p>— Recall Touch</p>
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
  if (!email || !process.env.RESEND_API_KEY) return false;
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
