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
    .maybeSingle();
  if (!ws) return false;

  const { data: user } = await db
    .from("users")
    .select("email")
    .eq("id", (ws as { owner_id: string }).owner_id)
    .maybeSingle();
  const email = (user as { email?: string } | null)?.email;
  if (!email) return false;

  const subject = "Your phone flow is ready";
  const body = `Your Revenue Operator phone flow is ready.

Open: https://www.recall-touch.com/app/dashboard`;

  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Revenue Operator <noreply@recall-touch.com>",
          to: email,
          subject,
          text: body,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok;
    }
    return true;
  } catch (_err) {
    // Send failed; non-fatal
    return false;
  }
}
