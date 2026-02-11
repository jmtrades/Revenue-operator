/**
 * Miss reporting: missed protections + automatically scheduled recovery.
 * Surfaces when we fell short and what we've done to recover.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const misses: Array<{
    type: string;
    lead_id: string;
    lead_name?: string;
    when: string;
    detail: string;
    recovery_scheduled: boolean;
    recovery_at?: string;
  }> = [];

  const { data: workspaceLeadIds } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
  const wLeadIds = (workspaceLeadIds ?? []).map((l: { id: string }) => l.id);
  if (wLeadIds.length === 0) {
    return NextResponse.json({ misses: [], summary: { total_misses: 0, follow_up_missed: 0, conversation_cold: 0, recovery_scheduled: 0 } });
  }

  const { data: automationStates } = await db
    .from("automation_states")
    .select("lead_id, no_reply_scheduled_at, last_event_at, state")
    .in("lead_id", wLeadIds)
    .lte("no_reply_scheduled_at", now.toISOString())
    .gte("no_reply_scheduled_at", weekStart.toISOString());

  const leadIdsFromAuto = [...new Set((automationStates ?? []).map((a: { lead_id: string }) => a.lead_id))];
  const { data: convLeads } = leadIdsFromAuto.length
    ? await db.from("leads").select("id, name, email").in("id", leadIdsFromAuto)
    : { data: [] };
  const leadMap = ((convLeads ?? []) as { id: string; name?: string; email?: string }[]).reduce(
    (acc, l) => {
      acc[l.id] = l.name ?? l.email ?? "Unknown";
      return acc;
    },
    {} as Record<string, string>
  );

  const { data: noReplyEvents } = await db
    .from("events")
    .select("entity_id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("event_type", "no_reply_timeout")
    .gte("created_at", weekStart.toISOString());

  const executedByLead = new Set(
    (noReplyEvents ?? []).map((e: { entity_id: string }) => e.entity_id)
  );

  const { data: pendingJobs } = await db
    .from("job_queue")
    .select("payload")
    .eq("status", "pending")
    .eq("job_type", "decision");

  const leadsWithPendingRecovery = new Set(
    (pendingJobs ?? [])
      .map((j) => (j as { payload?: { leadId?: string; workspaceId?: string } }).payload)
      .filter((p) => p?.workspaceId === workspaceId && p?.leadId)
      .map((p) => p!.leadId as string)
  );

  for (const auto of automationStates ?? []) {
    const a = auto as { lead_id: string; no_reply_scheduled_at: string; last_event_at?: string | null };
    if (!leadMap[a.lead_id]) continue;
    if (executedByLead.has(a.lead_id)) continue;
    misses.push({
      type: "follow_up_missed",
      lead_id: a.lead_id,
      lead_name: leadMap[a.lead_id],
      when: a.no_reply_scheduled_at,
      detail: "Follow-up window passed without outreach",
      recovery_scheduled: leadsWithPendingRecovery.has(a.lead_id),
      recovery_at: leadsWithPendingRecovery.has(a.lead_id) ? undefined : undefined,
    });
  }

  const { data: coldLeads } = await db
    .from("leads")
    .select("id, name, email, last_activity_at")
    .eq("workspace_id", workspaceId)
    .in("state", ["BOOKED", "QUALIFIED", "ENGAGED", "CONTACTED"])
    .lt("last_activity_at", threeDaysAgo.toISOString())
    .order("last_activity_at", { ascending: true })
    .limit(10);

  const coldLeadIds = (coldLeads ?? []).map((l: { id: string }) => l.id);
  const coldLeadMap = ((coldLeads ?? []) as { id: string; name?: string; email?: string; last_activity_at: string }[]).reduce(
    (acc, l) => {
      acc[l.id] = { name: l.name ?? l.email ?? "Unknown", last_activity_at: l.last_activity_at };
      return acc;
    },
    {} as Record<string, { name: string; last_activity_at: string }>
  );

  for (const lid of coldLeadIds) {
    if (misses.some((m) => m.lead_id === lid)) continue;
    const info = coldLeadMap[lid];
    if (!info) continue;
    misses.push({
      type: "conversation_cold",
      lead_id: lid,
      lead_name: info.name,
      when: info.last_activity_at,
      detail: "No contact 3+ days — recovery in progress",
      recovery_scheduled: leadsWithPendingRecovery.has(lid),
    });
  }

  return NextResponse.json({
    misses,
    summary: {
      total_misses: misses.length,
      follow_up_missed: misses.filter((m) => m.type === "follow_up_missed").length,
      conversation_cold: misses.filter((m) => m.type === "conversation_cold").length,
      recovery_scheduled: misses.filter((m) => m.recovery_scheduled).length,
    },
  });
}
