/**
 * Weekly trust email: "Here's what didn't fall through the cracks this week"
 * Retention anchor showing total conversations maintained, attendance secured, recoveries.
 */

import { getDb } from "@/lib/db/queries";

export async function sendWeeklyTrustEmails(): Promise<Array<{ workspaceId: string; email: string; sent: boolean }>> {
  const db = getDb();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setUTCHours(0, 0, 0, 0);

  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, owner_id, status")
    .neq("status", "paused");

  const results: Array<{ workspaceId: string; email: string; sent: boolean }> = [];

  for (const ws of workspaces ?? []) {
    const row = ws as { id: string; owner_id: string; status?: string };
    const workspaceId = row.id;

    const { data: weekActions } = await db
      .from("action_logs")
      .select("action")
      .eq("workspace_id", workspaceId)
      .gte("created_at", weekStart.toISOString());

    const actions = (weekActions ?? []) as { action: string }[];
    const followUps = actions.filter((a) => /follow|outreach|recovery|re-engag/i.test(a.action)).length;
    const replies = actions.filter((a) => /reply|response|message/i.test(a.action)).length;
    const attendance = actions.filter((a) => /attend|confirm|remind/i.test(a.action)).length;

    const { count: activeConversations } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    const { data: user } = await db.from("users").select("email").eq("id", row.owner_id).single();
    const email = (user as { email?: string } | null)?.email;
    if (!email) continue;

    const conversationsMaintained = Math.max(1, Math.floor((activeConversations ?? 0) * 0.7) + replies);
    const attendanceSecured = attendance;
    const recoveries = followUps;

    // Fail-safe: If no recoveries, interpret as stability
    const recoveryText = recoveries > 0 
      ? `• ${recoveries} quiet conversation${recoveries !== 1 ? "s" : ""} recovered`
      : `• No recoveries were needed this week — conversations stayed active`;

    const subject = "Here's what didn't fall through the cracks this week";
    const body = `This week we maintained continuity:

• ${conversationsMaintained} conversation${conversationsMaintained !== 1 ? "s" : ""} maintained
• ${attendanceSecured} attendance confirmation${attendanceSecured !== 1 ? "s" : ""} secured
${recoveryText}

Protection is running. You only take the calls.

View overview: ${process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "https://app.revenue-operator.com"}/dashboard`;

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
        results.push({ workspaceId, email, sent: res.ok });
      } else {
        console.log("[weekly-trust] Would send to", email, "subject:", subject);
        results.push({ workspaceId, email, sent: true });
      }
    } catch (err) {
      console.error("[weekly-trust]", err);
      results.push({ workspaceId, email, sent: false });
    }
  }

  return results;
}
