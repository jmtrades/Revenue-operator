/**
 * Cron: daily digest — send Slack/Teams notifications with today's stats (Task 24).
 * Run once per day (e.g. 8:00 AM workspace time or UTC).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { getNotificationChannels, notifyDailyDigest } from "@/lib/integrations/slack";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  const startIso = todayStart.toISOString();
  const endIso = todayEnd.toISOString();

  const { data: workspaces } = await db.from("workspaces").select("id");
  const workspaceIds = (workspaces ?? []) as { id: string }[];
  let sent = 0;

  for (const { id: workspaceId } of workspaceIds) {
    const channels = await getNotificationChannels(workspaceId, "daily_digest");
    if (channels.length === 0) continue;

    const [
      { count: callsToday },
      { count: leadsToday },
      { count: appointmentsToday },
    ] = await Promise.all([
      db.from("call_sessions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("call_ended_at", startIso).lt("call_ended_at", endIso),
      db.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", startIso).lt("created_at", endIso),
      db.from("appointments").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("start_time", startIso).lt("start_time", endIso).in("status", ["confirmed"]),
    ]);

    const calls = Number(callsToday ?? 0);
    const leads = Number(leadsToday ?? 0);
    const appointments = Number(appointmentsToday ?? 0);
    const message = `Here’s your recall for today.`;
    await notifyDailyDigest(workspaceId, {
      calls_today: calls,
      leads_today: leads,
      appointments_today: appointments,
      message,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, workspaces_checked: workspaceIds.length, digests_sent: sent });
}
