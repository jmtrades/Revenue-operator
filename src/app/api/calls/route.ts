/**
 * Call sessions for workspace (includes Zoom call-aware sessions)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();

    let sessionsList: unknown[] = [];
    const { data: byWorkspace, error: callsErr } = await db
    .from("call_sessions")
    .select(`
      id, lead_id, current_node, outcome, started_at, ended_at,
      workspace_id, external_meeting_id, external_meeting_uuid, provider,
      matched_lead_id, matched_confidence, call_started_at, call_ended_at,
      consent_granted, consent_mode, transcript_text, summary,
      recording_url, show_status, show_confidence, show_reason
    `)
    .eq("workspace_id", workspaceId)
    .order("call_started_at", { ascending: false, nullsFirst: false })
    .limit(50);
    if (callsErr) {
      log("error", "calls.get_query_failed", { error: callsErr.message });
      return NextResponse.json({ error: "Failed to load calls" }, { status: 500 });
    }

  if ((byWorkspace?.length ?? 0) > 0) {
    sessionsList = byWorkspace ?? [];
  } else {
    const { data: deals } = await db.from("deals").select("lead_id").eq("workspace_id", workspaceId);
    const leadIds = [...new Set((deals ?? []).map((d: { lead_id: string }) => d.lead_id))];
    if (leadIds.length > 0) {
      const { data: byLead } = await db
        .from("call_sessions")
        .select("id, lead_id, current_node, outcome, started_at, ended_at, workspace_id, external_meeting_id, external_meeting_uuid, provider, matched_lead_id, matched_confidence, call_started_at, call_ended_at, consent_granted, consent_mode, transcript_text, summary, recording_url, show_status, show_confidence, show_reason")
        .in("lead_id", leadIds)
        .order("call_started_at", { ascending: false, nullsFirst: false })
        .limit(50);
      sessionsList = byLead ?? [];
    }
  }

  const sessions = sessionsList as Array<{ id: string; lead_id?: string | null; matched_lead_id?: string | null }>;
  const leadIds = [...new Set(sessions.map((s) => s.lead_id ?? s.matched_lead_id).filter((x): x is string => Boolean(x)))];
  const { data: leads } = leadIds.length
    ? await db.from("leads").select("id, name, email, company").in("id", leadIds)
    : { data: [] };
  const leadMap = ((leads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).reduce(
    (acc, l) => {
      acc[l.id] = l;
      return acc;
    },
    {} as Record<string, { id: string; name?: string; email?: string; company?: string }>
  );

  const { data: analyses } = sessions.length
    ? await db
        .from("call_analysis")
        .select("call_session_id, analysis_json, confidence, analysis_source")
        .in("call_session_id", sessions.map((s) => s.id))
    : { data: [] };
  const analysisMap = ((analyses ?? []) as { call_session_id: string; analysis_json?: Record<string, unknown>; confidence?: number; analysis_source?: string | null }[]).reduce(
    (acc, a) => {
      acc[a.call_session_id] = a;
      return acc;
    },
    {} as Record<string, { analysis_json?: Record<string, unknown>; confidence?: number; analysis_source?: string | null }>
  );

  const calls = sessions.map((s) => {
    const a = analysisMap[s.id];
    const ana = (a?.analysis_json ?? {}) as Record<string, unknown>;
    const matchedId = s.matched_lead_id ?? s.lead_id ?? null;
    return {
      ...s,
      matched_lead: matchedId ? leadMap[matchedId] : null,
      analysis_outcome: ana.outcome ?? null,
      next_best_action: ana.next_best_action ?? null,
      followup_plan: ana.followup_plan ?? [],
      confidence: a?.confidence ?? null,
      analysis_source: a?.analysis_source ?? null,
    };
  });

  return NextResponse.json({ calls });
  } catch (error) {
    log("error", "calls.route_error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
