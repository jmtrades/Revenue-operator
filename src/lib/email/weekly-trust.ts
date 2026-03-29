/**
 * Weekly digest email sent every Monday.
 * Uses real workspace records so owners see calls answered, leads captured,
 * appointments booked, time saved, and the top unanswered topic to improve.
 */

import { getDb } from "@/lib/db/queries";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "https://www.revenueoperator.ai";

function formatHoursSaved(callCount: number): string {
  const hours = Math.max(0.5, Math.round((callCount * 4) / 60 * 10) / 10);
  return Number.isInteger(hours) ? `${hours.toFixed(0)}` : `${hours.toFixed(1)}`;
}

function toPlainTextDigest(input: {
  workspaceName: string;
  callsAnswered: number;
  leadsCaptured: number;
  appointmentsBooked: number;
  hoursSaved: string;
  topCallerQuestion: string;
}) {
  return [
    `${input.workspaceName} weekly digest`,
    "",
    `Calls answered: ${input.callsAnswered}`,
    `Leads captured: ${input.leadsCaptured}`,
    `Appointments booked: ${input.appointmentsBooked}`,
    `Time saved: ${input.hoursSaved} hour${input.hoursSaved === "1" ? "" : "s"}`,
    `Top caller question: ${input.topCallerQuestion}`,
    "",
    `Open dashboard: ${APP_URL}/app/dashboard`,
  ].join("\n");
}

export async function sendWeeklyTrustEmails(): Promise<Array<{ workspaceId: string; email: string; sent: boolean }>> {
  const db = getDb();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setUTCHours(0, 0, 0, 0);

  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, owner_id, status, name")
    .neq("status", "paused");

  const results: Array<{ workspaceId: string; email: string; sent: boolean }> = [];

  for (const ws of workspaces ?? []) {
    const row = ws as { id: string; owner_id: string; status?: string; name?: string | null };
    const workspaceId = row.id;
    const workspaceName = row.name?.trim() || "Revenue Operator";

    const [{ count: callsAnswered }, { count: leadsCaptured }, { count: appointmentsBooked }, { data: weekActions }, { data: user }] =
      await Promise.all([
        db
          .from("call_sessions")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .gte("started_at", weekStart.toISOString()),
        db
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .gte("created_at", weekStart.toISOString()),
        db
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .in("status", ["confirmed"])
          .gte("start_time", weekStart.toISOString()),
        db
          .from("action_logs")
          .select("action")
          .eq("workspace_id", workspaceId)
          .gte("created_at", weekStart.toISOString())
          .limit(200),
        db.from("users").select("email").eq("id", row.owner_id).maybeSingle(),
      ]);

    const email = (user as { email?: string } | null)?.email;
    if (!email) continue;

    const actions = (weekActions ?? []) as { action: string }[];
    const topCallerQuestion =
      actions.find((entry) => /knowledge|gap|faq|question/i.test(entry.action))?.action.replace(/[_-]/g, " ") ??
      "No major knowledge gaps showed up this week.";
    const safeCallsAnswered = callsAnswered ?? 0;
    const safeLeadsCaptured = leadsCaptured ?? 0;
    const safeAppointmentsBooked = appointmentsBooked ?? 0;
    const hoursSaved = formatHoursSaved(safeCallsAnswered);
    const subject = `${workspaceName}: ${safeCallsAnswered} calls answered this week`;
    const body = toPlainTextDigest({
      workspaceName,
      callsAnswered: safeCallsAnswered,
      leadsCaptured: safeLeadsCaptured,
      appointmentsBooked: safeAppointmentsBooked,
      hoursSaved,
      topCallerQuestion,
    });

    try {
      if (process.env.RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "Revenue Operator <noreply@revenueoperator.ai>",
            to: email,
            subject,
            text: body,
          }),
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
