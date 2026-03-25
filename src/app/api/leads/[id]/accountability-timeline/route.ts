/**
 * Accountability timeline: protection → preparation → attendance lifecycle for a lead.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const db = getDb();

  const { data: lead } = await db.from("leads").select("workspace_id, state").eq("id", leadId).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const workspaceId = (lead as { workspace_id: string }).workspace_id;

  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const { data: actions } = await db
    .from("action_logs")
    .select("action, payload, created_at")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .order("created_at", { ascending: true });

  const { data: events } = await db
    .from("events")
    .select("event_type, payload, created_at")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .order("created_at", { ascending: true });

  const { data: sessions } = await db
    .from("call_sessions")
    .select("id, call_started_at, show_status, show_reason")
    .or(`lead_id.eq.${leadId},matched_lead_id.eq.${leadId}`)
    .order("call_started_at", { ascending: true });

  type Phase = "protection" | "preparation" | "attendance";
  const timeline: Array<{
    phase: Phase;
    when: string;
    what: string;
    detail?: string;
  }> = [];

  const p = (payload: unknown) => (payload ?? {}) as Record<string, unknown>;

  for (const a of actions ?? []) {
    const act = a as { action: string; payload?: unknown; created_at: string };
    const pl = p(act.payload);
    if (act.action === "send_message" || act.action === "simulated_send_message") {
      const inner = (pl.action as string) ?? "outreach";
      const label =
        inner === "recovery" || inner === "win_back" ? "Recovery outreach" :
        inner === "reminder" || inner === "prep_info" ? "Preparation — reminder/prep" :
        inner === "booking" || inner === "call_invite" ? "Booking outreach" :
        "Follow-up";
      timeline.push({
        phase: inner === "reminder" || inner === "prep_info" ? "preparation" : "protection",
        when: act.created_at,
        what: label,
        detail: pl.policy_reason as string | undefined,
      });
    } else if (act.action === "restraint") {
      timeline.push({
        phase: "protection",
        when: act.created_at,
        what: "Follow-through continued",
        detail: (pl.noticed as string) ?? (pl.policy_reason as string),
      });
    } else if (act.action === "escalation_suggest") {
      timeline.push({
        phase: "protection",
        when: act.created_at,
        what: "Decision progressed",
        detail: (pl.noticed as string) ?? (pl.escalation_reason as string),
      });
    }
  }

  for (const e of events ?? []) {
    const ev = e as { event_type: string; payload?: unknown; created_at: string };
    if (ev.event_type === "booking_created") {
      timeline.push({
        phase: "preparation",
        when: ev.created_at,
        what: "They're set",
      });
    } else if (ev.event_type === "no_reply_timeout") {
      timeline.push({
        phase: "protection",
        when: ev.created_at,
        what: "Follow-through continued",
        detail: "Outreach scheduled",
      });
    }
  }

  for (const s of sessions ?? []) {
    const sess = s as { id: string; call_started_at: string; show_status?: string | null; show_reason?: string | null };
    const status = sess.show_status === "showed" ? "They're planning to attend" : sess.show_status === "no_show" ? "No-show" : "Unknown";
    timeline.push({
      phase: "attendance",
      when: sess.call_started_at,
      what: status,
      detail: sess.show_reason ?? undefined,
    });
  }

  timeline.sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());

  const phaseSummary = {
    protection: timeline.filter((t) => t.phase === "protection").length,
    preparation: timeline.filter((t) => t.phase === "preparation").length,
    attendance: timeline.filter((t) => t.phase === "attendance").length,
  };

  return NextResponse.json({
    lead_id: leadId,
    timeline,
    phase_summary: phaseSummary,
  });
}
