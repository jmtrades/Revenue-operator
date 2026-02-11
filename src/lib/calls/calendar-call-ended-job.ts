/**
 * Calendar call-ended job: infer show/no-show/unknown, update session,
 * then no_show recovery, post-call plan, or unknown check-in.
 */

import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { inferShowStatus } from "./show-inference";

const CONSERVATIVE_PLAN = {
  outcome: "unknown_no_transcript",
  next_best_action: "send_recap",
  followup_plan: [
    { when_hours_from_now: 0, action_type: "send_recap", template_key: "recap" },
    { when_hours_from_now: 2, action_type: "clarify_timeline", template_key: "next_step" },
    { when_hours_from_now: 24, action_type: "book_joint_call", template_key: "follow_up" },
  ],
  summary: "Calendar fallback: no transcript. Conservative plan: recap, next-step question, 24h follow-up.",
  confidence: 0.2,
  analysis_source: "calendar_fallback",
  buyer_signals: { pain_points: [], urgency: "unknown", authority: "unknown", budget_signals: "unknown", trust_level: "unknown" },
  objections: [],
  commitments: [],
  risks: [],
};

export async function runCalendarCallEndedJob(callSessionId: string): Promise<void> {
  const db = getDb();
  const { data: session } = await db
    .from("call_sessions")
    .select("workspace_id, lead_id, matched_lead_id, transcript_text, call_started_at, call_ended_at, metadata")
    .eq("id", callSessionId)
    .single();

  if (!session) return;

  const s = session as {
    workspace_id: string;
    lead_id?: string | null;
    matched_lead_id?: string | null;
    transcript_text?: string | null;
    call_started_at?: string | null;
    call_ended_at?: string | null;
    metadata?: { status?: string; duration_minutes?: number } | null;
  };
  const leadId = s.lead_id ?? s.matched_lead_id ?? null;
  if (!leadId) return;

  const { data: settingsRow } = await db.from("settings").select("hired_roles").eq("workspace_id", s.workspace_id).single();
  const hired = (settingsRow as { hired_roles?: string[] })?.hired_roles ?? ["full_autopilot"];
  if (!hired.includes("show_manager") && !hired.includes("full_autopilot")) return;

  const hasTranscript = Boolean(s.transcript_text && s.transcript_text.trim().length >= 50);
  if (hasTranscript) return;

  let recentMessages: Array<{ content: string; role?: string }> = [];
  const { data: convs } = await db.from("conversations").select("id").eq("lead_id", leadId);
  const convIds = (convs ?? []).map((c: { id: string }) => c.id);
  if (convIds.length > 0) {
    const { data: msgs } = await db
      .from("messages")
      .select("content, role")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(10);
    recentMessages = (msgs ?? []).map((m: { content: string; role?: string }) => ({ content: m.content, role: m.role }));
  }

  const { data: wrapup } = await db
    .from("call_wrapups")
    .select("outcome")
    .eq("call_session_id", callSessionId)
    .limit(1)
    .single();

  const result = inferShowStatus({
    callSession: {
      call_started_at: s.call_started_at,
      call_ended_at: s.call_ended_at,
      metadata: s.metadata,
    },
    recentMessages,
    wrapUp: wrapup ? { outcome: (wrapup as { outcome: string }).outcome } : null,
  });

  await db
    .from("call_sessions")
    .update({
      show_status: result.status,
      show_confidence: result.confidence,
      show_reason: result.reason,
    })
    .eq("id", callSessionId);

  const { data: existing } = await db.from("call_analysis").select("id").eq("call_session_id", callSessionId).single();
  if (!existing) {
    await db.from("call_analysis").insert({
      workspace_id: s.workspace_id,
      call_session_id: callSessionId,
      analysis_json: CONSERVATIVE_PLAN,
      confidence: CONSERVATIVE_PLAN.confidence,
      analysis_source: "calendar_fallback",
    });
  }

  await db.from("action_logs").insert({
    workspace_id: s.workspace_id,
    entity_type: "lead",
    entity_id: leadId,
    action: "call_show_inference",
    actor: "Show Manager",
    role: "show_manager",
    payload: { call_session_id: callSessionId, show_status: result.status, confidence: result.confidence, reason: result.reason },
  });

  if (result.status === "no_show") {
    await enqueue({ type: "no_show_reminder", leadId });
    return;
  }
  if (result.status === "showed") {
    await enqueue({ type: "execute_post_call_plan", callSessionId, workspaceId: s.workspace_id, leadId });
    return;
  }
  await enqueue({ type: "post_call_unknown_checkin", leadId, workspaceId: s.workspace_id, callSessionId });
}
