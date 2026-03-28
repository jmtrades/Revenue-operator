/**
 * "Your AI agent is live" email — sent after onboarding/workspace is saved and agent is ready.
 */

import { getDb } from "@/lib/db/queries";

const FROM = process.env.EMAIL_FROM ?? "Recall Touch <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

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
  const subject = "Your AI agent is live";
  const html = `
    <p>Hi,</p>
    <p>Your Recall Touch AI agent for <strong>${escapeHtml(businessName)}</strong> is set up and ready.</p>
    <p>Forward your phone number in Settings to start receiving calls, or try the demo anytime.</p>
    <p><a href="${APP_URL}/app/dashboard">Open dashboard →</a></p>
    <p>— Recall Touch</p>
  `;

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
