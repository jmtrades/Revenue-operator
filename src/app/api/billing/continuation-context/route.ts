/**
 * Responsibility continuation context: active conversations, scheduled follow-ups, pending confirmations.
 * Used for the interstitial before payment to show what ongoing work would be interrupted.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const now = new Date();
  const fortyEightHoursEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: leads } = await db
    .from("leads")
    .select("id, name, email, company")
    .eq("workspace_id", workspaceId)
    .neq("opt_out", true)
    .in("state", ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "SHOWED", "REACTIVATE"])
    .order("last_activity_at", { ascending: false })
    .limit(12);

  const active_conversations = ((leads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).map(
    (l) => ({
      id: l.id,
      name: l.name ?? l.email ?? "Unknown",
      company: l.company,
    })
  );

  const { data: pendingJobs } = await db
    .from("job_queue")
    .select("id, job_type, payload, created_at")
    .eq("status", "pending")
    .eq("job_type", "decision")
    .order("created_at", { ascending: true })
    .limit(50);

  const workspaceJobs = (pendingJobs ?? []).filter((j) => {
    const p = (j as { payload?: { workspaceId?: string } }).payload;
    return (p?.workspaceId ?? (p as Record<string, string>)?.["workspaceId"]) === workspaceId;
  });

  const scheduled_follow_ups = {
    count: workspaceJobs.length,
    next_at: workspaceJobs[0]
      ? (workspaceJobs[0] as { created_at: string }).created_at
      : null,
  };

  const { data: upcomingSessions } = await db
    .from("call_sessions")
    .select("id, lead_id, call_started_at, show_status")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", now.toISOString())
    .lt("call_started_at", fortyEightHoursEnd.toISOString());

  const pendingConfirmations = (upcomingSessions ?? []).filter(
    (s: { show_status?: string | null }) => s.show_status == null || s.show_status === ""
  );
  const leadIds = [...new Set(pendingConfirmations.map((s: { lead_id: string }) => s.lead_id))];
  const { data: confLeads } =
    leadIds.length > 0
      ? await db.from("leads").select("id, name, email, company").in("id", leadIds)
      : { data: [] };
  const confLeadMap = ((confLeads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).reduce(
    (acc, l) => {
      acc[l.id] = l.name ?? l.email ?? "Unknown";
      return acc;
    },
    {} as Record<string, string>
  );

  const pending_confirmations = pendingConfirmations.map((s: { id: string; lead_id: string; call_started_at: string }) => ({
    id: s.id,
    lead_id: s.lead_id,
    name: confLeadMap[s.lead_id] ?? "Unknown",
    call_at: s.call_started_at,
  }));

  return NextResponse.json({
    active_conversations,
    scheduled_follow_ups: {
      count: scheduled_follow_ups.count,
      next_at: scheduled_follow_ups.next_at,
    },
    pending_confirmations,
    summary: {
      active_count: active_conversations.length,
      follow_ups_count: scheduled_follow_ups.count,
      confirmations_count: pending_confirmations.length,
    },
  });
}
