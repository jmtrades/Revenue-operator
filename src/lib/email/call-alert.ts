import { getDb } from "@/lib/db/queries";

const FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@revenueoperator.ai>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.revenueoperator.ai";

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
  const callerLine = input.callerPhone?.trim() ? `<p><strong>Caller:</strong> ${escapeHtml(input.callerPhone.trim())}</p>` : "";
  const subject = `${workspaceName}: ${outcomeLabel}`;
  const html = `
    <p>New call outcome for <strong>${escapeHtml(workspaceName)}</strong>.</p>
    <p><strong>Outcome:</strong> ${escapeHtml(outcomeLabel)}</p>
    ${callerLine}
    <p><strong>Summary:</strong> ${escapeHtml(summary)}</p>
    <p><a href="${APP_URL}/app/calls/${input.callSessionId}">Open call record →</a></p>
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
