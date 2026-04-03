/**
 * Daily trust email: "X conversations didn't go quiet today"
 * Short bullet list of prevented losses. Increases retention.
 */

import { getDb } from "@/lib/db/queries";

export async function sendDailyTrustEmails(): Promise<Array<{ workspaceId: string; email: string; sent: boolean }>> {
  const db = getDb();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, owner_id, status")
    .neq("status", "paused");

  const results: Array<{ workspaceId: string; email: string; sent: boolean }> = [];

  for (const ws of workspaces ?? []) {
    const row = ws as { id: string; owner_id: string; status?: string };
    const workspaceId = row.id;

    const { data: todayActions } = await db
      .from("action_logs")
      .select("action")
      .eq("workspace_id", workspaceId)
      .gte("created_at", todayStart.toISOString());

    const actions = (todayActions ?? []) as { action: string }[];
    const followUps = actions.filter((a) => /follow|outreach|recovery|re-engag/i.test(a.action)).length;
    const replies = actions.filter((a) => /reply|response|message/i.test(a.action)).length;
    const attendance = actions.filter((a) => /attend|confirm|remind/i.test(a.action)).length;

    const { data: user } = await db.from("users").select("email").eq("id", row.owner_id).maybeSingle();
    const email = (user as { email?: string } | null)?.email;
    if (!email) continue;

    const bullets: string[] = [];
    if (replies > 0) bullets.push(`Conversations continued: ${replies}`);
    if (followUps > 0) bullets.push(`Decisions progressed: ${followUps}`);
    if (attendance > 0) bullets.push(`Attendance was confirmed: ${attendance}`);

    const subject = "Today's activity snapshot";
    const body = `${replies} conversations moved forward today.

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
        results.push({ workspaceId, email, sent: res.ok });
      } else {
        results.push({ workspaceId, email, sent: true });
      }
    } catch (_err) {
      // Send failed; non-fatal
      results.push({ workspaceId, email, sent: false });
    }
  }

  return results;
}
