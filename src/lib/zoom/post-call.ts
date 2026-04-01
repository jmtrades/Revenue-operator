/**
 * Post-call follow-up execution: safe, policy-respecting, commitment-aware
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { evaluateState } from "@/lib/state-machine";
import { getCommitmentScore, getAdjustedReminderHours } from "@/lib/commitment";

const _SAFE_RECAP = "Thanks for the call. Here's a quick recap of what we discussed. Let me know if you have any questions.";
const _SAFE_FOLLOW_UP = "Following up on our conversation. Would a quick call this week work to continue the discussion?";

export async function executePostCallPlan(
  callSessionId: string,
  workspaceId: string,
  leadId: string
): Promise<void> {
  const db = getDb();
  const { data: settings } = await db.from("settings").select("hired_roles").eq("workspace_id", workspaceId).maybeSingle();
  const hired = (settings as { hired_roles?: string[] })?.hired_roles ?? ["full_autopilot"];
  if (!hired.includes("follow_up_manager") && !hired.includes("full_autopilot")) return;

  const { data: analysisRow } = await db
    .from("call_analysis")
    .select("analysis_json")
    .eq("call_session_id", callSessionId)
    .maybeSingle();

  if (!analysisRow) return;

  const analysis = (analysisRow as { analysis_json?: { outcome?: string; next_best_action?: string; followup_plan?: Array<{ when_hours_from_now: number; action_type: string; template_key: string }> } }).analysis_json ?? {};
  const nextAction = analysis.next_best_action ?? "send_recap";
  const plan = analysis.followup_plan ?? [];

  const { data: lead } = await db.from("leads").select("state").eq("id", leadId).maybeSingle();
  const currentState = (lead as { state?: string })?.state ?? "BOOKED";

  const newState = evaluateState(
    currentState as import("@/lib/types").LeadState,
    "call_completed",
    {}
  );

  await db.from("leads").update({
    status: newState,
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  }).eq("id", leadId);

  await db.from("events").insert({
    workspace_id: workspaceId,
    event_type: "call_completed",
    entity_type: "lead",
    entity_id: leadId,
    payload: { call_session_id: callSessionId, analysis_outcome: analysis.outcome },
    trigger_source: "zoom",
  });

  await db.from("action_logs").insert({
    workspace_id: workspaceId,
    entity_type: "lead",
    entity_id: leadId,
    action: "post_call_analysis",
    actor: "Follow-up Manager",
    role: "follow_up_manager",
    payload: { call_session_id: callSessionId, next_best_action: nextAction, plan },
  });

  // Recalculate lead score from call interactions (Task 30)
  try {
    const { recalculateLeadScoreFromDb } = await import("@/lib/lead-scoring");
    void recalculateLeadScoreFromDb(leadId);
  } catch (e) {
    log("error", "recalculateLeadScoreFromDb failed", { error: e instanceof Error ? e.message : String(e) });
  }

  const commitmentScore = await getCommitmentScore(leadId);

  const immediateRecap = nextAction === "send_recap" || plan.some((p) => p.action_type === "send_recap" && p.when_hours_from_now <= 1);
  if (immediateRecap) {
    const adjustedHours = getAdjustedReminderHours(2, commitmentScore);
    const delayMs = Math.round(adjustedHours * 60 * 60 * 1000);
    setTimeout(() => {
      enqueue({
        type: "decision",
        leadId,
        workspaceId,
        eventId: callSessionId,
      }).catch((e) => {
        log("error", "enqueue post-call plan failed", { error: e instanceof Error ? e.message : String(e) });
      });
    }, Math.min(delayMs, 2 * 60 * 60 * 1000));
  }

  for (const step of plan) {
    if (step.when_hours_from_now > 0) {
      const adjustedHours = getAdjustedReminderHours(step.when_hours_from_now, commitmentScore);
      const delayMs = Math.round(adjustedHours * 60 * 60 * 1000);
      setTimeout(() => {
        enqueue({
          type: "decision",
          leadId,
          workspaceId,
          eventId: callSessionId,
        }).catch((e) => {
        log("error", "enqueue post-call plan failed", { error: e instanceof Error ? e.message : String(e) });
      });
      }, Math.min(delayMs, 48 * 60 * 60 * 1000));
    }
  }
}
