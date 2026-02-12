export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { consumeWrapupToken } from "@/lib/calls/wrapup-token";
import { enqueue } from "@/lib/queue";

const OUTCOME_TO_ANALYSIS: Record<string, string> = {
  interested: "hot_delay",
  thinking: "info_gap",
  not_fit: "lost_politely",
};

export async function POST(req: NextRequest) {
  let body: { token?: string; outcome?: string; objection_text?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.token || !body.outcome) {
    return NextResponse.json({ error: "token and outcome required" }, { status: 400 });
  }
  if (!["interested", "thinking", "not_fit"].includes(body.outcome)) {
    return NextResponse.json({ error: "invalid outcome" }, { status: 400 });
  }

  const consumed = await consumeWrapupToken(body.token);
  if (!consumed) {
    return NextResponse.json({ error: "Invalid or already used token" }, { status: 400 });
  }

  const db = getDb();
  await db.from("call_wrapups").insert({
    call_session_id: consumed.callSessionId,
    outcome: body.outcome,
    objection_text: body.objection_text ?? null,
    submitted_by: "closer",
  });

  const analysisOutcome = OUTCOME_TO_ANALYSIS[body.outcome] ?? "info_gap";
  await db
    .from("call_sessions")
    .update({
      show_status: "showed",
      show_confidence: 1,
      show_reason: "Closer wrap-up: " + body.outcome,
    })
    .eq("id", consumed.callSessionId);

  const { data: session } = await db
    .from("call_sessions")
    .select("lead_id, matched_lead_id")
    .eq("id", consumed.callSessionId)
    .single();
  const leadId = (session as { lead_id?: string | null; matched_lead_id?: string | null })?.lead_id ?? (session as { matched_lead_id?: string | null })?.matched_lead_id;
  if (leadId) {
    const { data: existing } = await db.from("call_analysis").select("id").eq("call_session_id", consumed.callSessionId).single();
    const analysisJson = {
      outcome: analysisOutcome,
      next_best_action: body.outcome === "interested" ? "send_recap" : body.outcome === "thinking" ? "nurture" : "reactivation_schedule",
      followup_plan:
        body.outcome === "interested"
          ? [
              { when_hours_from_now: 0, action_type: "send_recap", template_key: "recap" },
              { when_hours_from_now: 24, action_type: "book_joint_call", template_key: "follow_up" },
            ]
          : [{ when_hours_from_now: 48, action_type: "nurture", template_key: "follow_up" }],
      summary: "Wrap-up: " + body.outcome + (body.objection_text ? ". Objection: " + body.objection_text : ""),
      confidence: 1,
      analysis_source: "wrap_up",
    };
    if (!existing) {
      await db.from("call_analysis").insert({
        workspace_id: consumed.workspaceId,
        call_session_id: consumed.callSessionId,
        analysis_json: analysisJson,
        confidence: 1,
        analysis_source: "wrap_up",
      });
    } else {
      await db.from("call_analysis").update({ analysis_json: analysisJson, analysis_source: "wrap_up" }).eq("call_session_id", consumed.callSessionId);
    }
    await enqueue({ type: "execute_post_call_plan", callSessionId: consumed.callSessionId, workspaceId: consumed.workspaceId, leadId });
    try {
      const { recordCloserFeedback } = await import("@/lib/outcomes/closer-feedback");
      await recordCloserFeedback(consumed.workspaceId, leadId, "showed");
    } catch {
      // Non-blocking
    }
  }

  return NextResponse.json({ ok: true });
}
