/**
 * Command center: hot leads, at-risk leads, activity feed, today's impact
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

function humanAction(action: string, payload?: unknown): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (action === "send_message") return "Replied to prospect";
  if (action === "post_call_analysis") return "Scheduled follow-up after call";
  if (action === "post_call_unknown_checkin") return "Sent check-in after call";
  if (action === "call_show_inference") return "Detected show or no-show";
  if (action === "simulated_send_message") return "Previewed reply (not sent)";
  if (action.includes("escalation")) return "Flagged for human review";
  return action.replace(/_/g, " ");
}

function humanEvent(event: string): string {
  if (event === "message_received") return "New message";
  if (event === "call_completed") return "Call completed";
  if (event === "booking_created") return "Call booked";
  if (event === "no_reply_timeout") return "No reply — follow-up scheduled";
  if (event === "manual_update") return "Manual update";
  if (event === "no_show_reminder") return "No-show — recovery triggered";
  return event.replace(/_/g, " ");
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: ws } = await db.from("workspaces").select("status, pause_reason").eq("id", workspaceId).single();
  const wsRow = ws as { status?: string; pause_reason?: string } | undefined;
  const { data: settingsRow } = await db.from("settings").select("preview_mode").eq("workspace_id", workspaceId).single();
  const previewMode = (settingsRow as { preview_mode?: boolean })?.preview_mode ?? false;

  const operatorStatus = wsRow?.pause_reason ? "Paused" : previewMode ? "Preview" : wsRow?.status === "active" ? "Running" : "Stopped";

  const { data: deals } = await db
    .from("deals")
    .select("id, lead_id, value_cents, status")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"])
    .neq("status", "lost");

  const hotLeads: Array<{ id: string; lead_id: string; name?: string; email?: string; company?: string; probability: number; value_cents: number }> = [];
  const dealIds = (deals ?? []).map((d: { id: string; lead_id: string }) => d.id);
  const leadIds = [...new Set((deals ?? []).map((d: { lead_id: string }) => d.lead_id))];

  if (leadIds.length > 0) {
    const { data: leads } = await db.from("leads").select("id, name, email, company, state").in("id", leadIds);
    const leadMap = ((leads ?? []) as { id: string; name?: string; email?: string; company?: string; state?: string }[]).reduce(
      (acc, l) => { acc[l.id] = l; return acc; },
      {} as Record<string, { name?: string; email?: string; company?: string; state?: string }>
    );
    for (let i = 0; i < Math.min((deals ?? []).length, 15); i++) {
      const d = (deals ?? [])[i];
      const deal = d as { id: string; lead_id: string; value_cents?: number };
      try {
        const pred = await predictDealOutcome(deal.id);
        if (pred.probability >= 0.4) {
          const l = leadMap[deal.lead_id];
          hotLeads.push({
            id: deal.id,
            lead_id: deal.lead_id,
            name: l?.name ?? undefined,
            email: l?.email ?? undefined,
            company: l?.company ?? undefined,
            probability: pred.probability,
            value_cents: deal.value_cents ?? 0,
          });
        }
      } catch {
        // skip
      }
      if (hotLeads.length >= 5) break;
    }
    hotLeads.sort((a, b) => b.probability - a.probability);
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const { data: atRiskLeads } = await db
    .from("leads")
    .select("id, name, email, company, state, last_activity_at")
    .eq("workspace_id", workspaceId)
    .in("state", ["BOOKED", "QUALIFIED", "ENGAGED", "CONTACTED"])
    .order("last_activity_at", { ascending: true })
    .limit(20);

  const atRisk = (atRiskLeads ?? [])
    .filter((l: { last_activity_at?: string }) => !l.last_activity_at || new Date(l.last_activity_at) < threeDaysAgo)
    .slice(0, 5)
    .map((l: { id: string; name?: string; email?: string; company?: string; state?: string }) => ({
      id: l.id,
      name: l.name ?? l.email ?? "Unknown",
      company: l.company,
      state: l.state,
    }));

  const { data: recentActions } = await db
    .from("action_logs")
    .select("action, entity_id, payload, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(15);

  const { data: recentEvents } = await db
    .from("events")
    .select("event_type, entity_id, payload, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(15);

  const activityEntityIds = [
    ...new Set([
      ...(recentActions ?? []).map((a: { entity_id: string }) => a.entity_id),
      ...(recentEvents ?? []).map((e: { entity_id: string }) => e.entity_id),
    ]),
  ];
  const { data: activityLeads } = activityEntityIds.length
    ? await db.from("leads").select("id, name, email, company").in("id", activityEntityIds)
    : { data: [] };
  const activityLeadMap = ((activityLeads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).reduce(
    (acc, l) => { acc[l.id] = l.name ?? l.email ?? l.company ?? "Unknown"; return acc; },
    {} as Record<string, string>
  );

  const activity: Array<{ what: string; who: string; when: string; why?: string }> = [];
  const seen = new Set<string>();
  const merged = [
    ...(recentActions ?? []).map((a: { action: string; entity_id: string; payload?: unknown; created_at: string }) => ({
      ...a,
      type: "action" as const,
    })),
    ...(recentEvents ?? []).map((e: { event_type: string; entity_id: string; payload?: unknown; created_at: string }) => ({
      action: e.event_type,
      entity_id: e.entity_id,
      payload: e.payload,
      created_at: e.created_at,
      type: "event" as const,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  for (const item of merged) {
    const key = `${item.type}:${item.entity_id}:${item.created_at}`;
    if (seen.has(key) || activity.length >= 10) continue;
    seen.add(key);
    const what = item.type === "action" ? humanAction(item.action, item.payload) : humanEvent(item.action);
    activity.push({
      what,
      who: activityLeadMap[item.entity_id] ?? "—",
      when: item.created_at,
      why: (item.payload as { policy_reason?: string; reasoning?: string })?.policy_reason ?? (item.payload as { reasoning?: string })?.reasoning,
    });
  }

  const { data: todayBookings } = await db
    .from("events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", todayStart.toISOString());
  const { data: todayCompletions } = await db
    .from("events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("event_type", "call_completed")
    .gte("created_at", todayStart.toISOString());

  const { data: lastAction } = await db
    .from("action_logs")
    .select("action, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: nextScheduled } = await db
    .from("job_queue")
    .select("job_type, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return NextResponse.json({
    operator_status: operatorStatus,
    last_action: lastAction ? humanAction((lastAction as { action: string }).action) + ` (${new Date((lastAction as { created_at: string }).created_at).toLocaleTimeString()})` : null,
    next_action: nextScheduled ? "Follow-up scheduled" : null,
    today_booked: (todayBookings ?? []).length,
    today_recovered: (todayCompletions ?? []).length,
    hot_leads: hotLeads.slice(0, 5),
    at_risk: atRisk,
    activity,
  });
}
