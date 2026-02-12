/**
 * Attendance Protection Engine
 * When call is booked, system becomes responsible for attendance.
 * Escalates intervention intensity based on attendance_probability.
 */

import { getDb } from "@/lib/db/queries";
import { evaluateDealOutcome, getDealOutcome } from "@/lib/outcomes/model";
import { setLeadPlan } from "@/lib/plans/lead-plan";
import { enqueue } from "@/lib/queue";

/** Protect attendance for a booked lead. Run when processing BOOKED state. */
export async function protectAttendance(leadId: string): Promise<{ action: string } | null> {
  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("id, workspace_id, state")
    .eq("id", leadId)
    .single();
  if (!lead || (lead as { state: string }).state !== "BOOKED") return null;

  const workspaceId = (lead as { workspace_id: string }).workspace_id;

  const { data: settingsRow } = await db.from("settings").select("coverage_flags").eq("workspace_id", workspaceId).single();
  const { isCoverageEnabled } = await import("@/lib/coverage-flags");
  const flags = (settingsRow as { coverage_flags?: Record<string, boolean> })?.coverage_flags;
  if (!isCoverageEnabled(flags, "confirmation")) return null;
  const outcome = await evaluateDealOutcome(workspaceId, leadId);
  if (!outcome || outcome.stage !== "booked") return null;

  const attendanceProb = outcome.probability;
  const now = new Date();

  const { data: plan } = await db
    .from("lead_plans")
    .select("next_action_type, next_action_at")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .eq("status", "active")
    .single();

  if (attendanceProb < 0.3) {
    const rescueAt = new Date(now.getTime() + 30 * 60 * 1000);
    await setLeadPlan(workspaceId, leadId, {
      next_action_type: "reminder",
      next_action_at: rescueAt.toISOString(),
    });
    await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
    return { action: "rescue_scheduled" };
  }

  if (attendanceProb < 0.45) {
    const confirmAt = new Date(now.getTime() + 60 * 60 * 1000);
    await setLeadPlan(workspaceId, leadId, {
      next_action_type: "clarifying_question",
      next_action_at: confirmAt.toISOString(),
    });
    await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
    return { action: "confirmation_scheduled" };
  }

  if (attendanceProb < 0.65) {
    const planAt = plan?.next_action_at ? new Date((plan as { next_action_at: string }).next_action_at) : null;
    const isRecent = planAt && (planAt.getTime() - now.getTime()) < 2 * 60 * 60 * 1000;
    if (!isRecent) {
      const reminderAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      await setLeadPlan(workspaceId, leadId, {
        next_action_type: "reminder",
        next_action_at: reminderAt.toISOString(),
      });
      await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
      return { action: "reminder_escalated" };
    }
  }

  return null;
}

/** Get attendance probability for a lead (from deal_outcomes or evaluate). */
export async function getAttendanceProbability(
  workspaceId: string,
  leadId: string
): Promise<number> {
  const outcome = await getDealOutcome(workspaceId, leadId);
  if (!outcome || outcome.stage !== "booked") return 0.5;
  return outcome.probability;
}
