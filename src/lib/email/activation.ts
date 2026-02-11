/**
 * Activation confirmation email.
 * Sent when workspace is activated so the user knows the system is handling conversations.
 */

import { getDb } from "@/lib/db/queries";

export async function sendActivationConfirmationEmail(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("owner_id, name")
    .eq("id", workspaceId)
    .single();
  if (!ws) return false;

  const { data: user } = await db
    .from("users")
    .select("email")
    .eq("id", (ws as { owner_id: string }).owner_id)
    .single();
  const email = (user as { email?: string } | null)?.email;
  if (!email) return false;

  const subject = "Revenue Operator is now handling your conversations";
  const body = `Your Revenue Operator is live.

We're now:
• Preparing responses when new conversations come in
• Scheduling follow-ups so leads don't go cold
• Reminding people before calls

You only need to take the calls. We handle the rest.

View your dashboard: ${process.env.BASE_URL || "https://app.revenue-operator.com"}/dashboard`;

  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Revenue Operator <noreply@revenue-operator.com>",
          to: email,
          subject,
          text: body,
        }),
      });
      return res.ok;
    }
    console.log("[activation-email] Would send to", email, "(RESEND_API_KEY not set)");
    return true;
  } catch (err) {
    console.error("[activation-email]", err);
    return false;
  }
}
