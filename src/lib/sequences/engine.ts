/**
 * Deterministic Sequence Engine — Controlled cadences.
 * No freeform scheduling. Sequences define steps with delays and template keys.
 */
/**
 * @deprecated Use follow-up-engine.ts instead.
 * This file uses legacy sequence_runs + hardcoded step cadences.
 * Kept for reference only. Do not import in new code.
 */

import { getDb } from "@/lib/db/queries";
import type { DealStateVector } from "@/lib/engines/perception";
import { setLeadPlan } from "@/lib/plans/lead-plan";
import { getSequenceDelayMultiplier, type WorkspaceStrategyState } from "@/lib/strategy/planner";
import { fetchSingleRow, type DbSingleQuery } from "@/lib/db/single-row";

async function maybeSingleCompat(q: { maybeSingle?: () => unknown; single?: () => unknown }): Promise<{ data: unknown | null }> {
  try {
    const res = (typeof q.maybeSingle === "function" ? await q.maybeSingle() : await q.single?.()) as { data?: unknown } | null;
    return { data: res?.data ?? null };
  } catch {
    return { data: null };
  }
}

export interface SequenceStep {
  step: number;
  delay_hours: number;
  intervention_type: string;
  template_key: string;
  stop_on_reply: boolean;
}

export interface Sequence {
  id: string;
  workspace_id: string;
  name: string;
  purpose: "followup" | "revival" | "attendance";
  is_default: boolean;
  steps: SequenceStep[];
}

const DEFAULT_FOLLOWUP_STEPS: SequenceStep[] = [
  { step: 1, delay_hours: 4, intervention_type: "clarify", template_key: "followup_1", stop_on_reply: true },
  { step: 2, delay_hours: 24, intervention_type: "reassurance", template_key: "followup_2", stop_on_reply: true },
  { step: 3, delay_hours: 72, intervention_type: "revive", template_key: "followup_3", stop_on_reply: true },
];

const DEFAULT_REVIVAL_STEPS: SequenceStep[] = [
  { step: 1, delay_hours: 24, intervention_type: "revive", template_key: "revival_1", stop_on_reply: true },
  { step: 2, delay_hours: 72, intervention_type: "revive", template_key: "revival_2", stop_on_reply: true },
];

const DEFAULT_ATTENDANCE_STEPS: SequenceStep[] = [
  { step: 1, delay_hours: 2, intervention_type: "reminder", template_key: "reminder_1", stop_on_reply: true },
  { step: 2, delay_hours: 24, intervention_type: "prep_info", template_key: "prep_1", stop_on_reply: true },
];

/** Choose sequence based on state vector and settings. Ensures a sequence exists (creates default if none). */
export async function chooseSequence(
  stateVector: DealStateVector,
  _settings: Record<string, unknown>
): Promise<Sequence> {
  const db = getDb();
  const state = stateVector.state;
  const purpose = state === "BOOKED"
    ? "attendance"
    : state === "REACTIVATE" || stateVector.engagement_decay_hours > 72
      ? "revival"
      : "followup";

  const { data: seq } = await maybeSingleCompat(
    db
      .from("sequences")
      .select("*")
      .eq("workspace_id", stateVector.workspace_id)
      .eq("purpose", purpose)
      .limit(1),
  );

  if (seq) {
    return seq as Sequence;
  }

  const defaultSteps =
    purpose === "attendance"
      ? DEFAULT_ATTENDANCE_STEPS
      : purpose === "revival"
        ? DEFAULT_REVIVAL_STEPS
        : DEFAULT_FOLLOWUP_STEPS;

  let created: unknown = null;
  try {
    const q = db
      .from("sequences")
      .insert({
        workspace_id: stateVector.workspace_id,
        name: `Default ${purpose}`,
        purpose,
        is_default: true,
        steps: defaultSteps,
      })
      .select("id, workspace_id, name, purpose, is_default, steps") as unknown as DbSingleQuery;
    created = await fetchSingleRow(q);
  } catch {
    created = null;
  }

  if (created && (created as { id: string }).id) {
    return created as Sequence;
  }
  let fallback: unknown = null;
  try {
    const q = db
      .from("sequences")
      .select("*")
      .eq("workspace_id", stateVector.workspace_id)
      .eq("purpose", purpose)
      .limit(1) as unknown as DbSingleQuery;
    fallback = await fetchSingleRow(q);
  } catch {
    fallback = null;
  }
  if (fallback) return fallback as Sequence;
  return {
    id: "",
    workspace_id: stateVector.workspace_id,
    name: `Default ${purpose}`,
    purpose,
    is_default: true,
    steps: defaultSteps,
  } as Sequence;
}

/** Start a sequence for a lead. When sequenceId is empty, only sets lead_plan (no sequence_run). */
export async function startSequence(
  workspaceId: string,
  leadId: string,
  sequenceId: string | null,
  sequence: Sequence,
  strategyState?: WorkspaceStrategyState | null
): Promise<void> {
  const step = sequence.steps[0];
  if (!step) return;

  const mult = strategyState ? getSequenceDelayMultiplier(strategyState.aggressiveness_level) : 1;
  const delayHours = Math.max(1, step.delay_hours * mult);

  const nextAt = new Date();
  nextAt.setHours(nextAt.getHours() + delayHours);

  if (sequenceId) {
    const db = getDb();
    let existing: unknown = null;
    try {
      const q = db
        .from("sequence_runs")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId) as unknown as DbSingleQuery;
      existing = await fetchSingleRow(q);
    } catch {
      existing = null;
    }

    if (existing) {
      await db
        .from("sequence_runs")
        .update({
          sequence_id: sequenceId,
          current_step: 1,
          status: "running",
          stopped_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId);
    } else {
      await db.from("sequence_runs").insert({
        workspace_id: workspaceId,
        lead_id: leadId,
        sequence_id: sequenceId,
        current_step: 1,
        status: "running",
      });
    }
  }

  await setLeadPlan(workspaceId, leadId, {
    next_action_type: step.intervention_type,
    next_action_at: nextAt.toISOString(),
    sequence_id: sequenceId,
    sequence_step: 1,
  });
}

/** Advance sequence on no-reply timeout or scheduled tick */
export async function advanceSequence(
  workspaceId: string,
  leadId: string,
  strategyState?: WorkspaceStrategyState | null
): Promise<{ advanced: boolean; nextStep?: SequenceStep; nextActionAt?: string }> {
  const db = getDb();
  let run: unknown = null;
  try {
    const q = db
      .from("sequence_runs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .eq("status", "running") as unknown as DbSingleQuery;
    run = await fetchSingleRow(q);
  } catch {
    run = null;
  }

  if (!run) return { advanced: false };

  const r = run as { sequence_id: string; current_step: number };
  let seq: unknown = null;
  try {
    const q = db.from("sequences").select("steps").eq("id", r.sequence_id) as unknown as DbSingleQuery;
    seq = await fetchSingleRow(q);
  } catch {
    seq = null;
  }
  const steps = ((seq as { steps?: SequenceStep[] })?.steps ?? []) as SequenceStep[];
  const nextStepIndex = steps.findIndex((s) => s.step === r.current_step + 1);
  if (nextStepIndex < 0) {
    await db
      .from("sequence_runs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId);
    return { advanced: true };
  }

  const nextStep = steps[nextStepIndex];
  const { getWorkspaceStrategy } = await import("@/lib/strategy/planner");
  const strategy = strategyState ?? (await getWorkspaceStrategy(workspaceId));
  const mult = getSequenceDelayMultiplier(strategy.aggressiveness_level);
  let nextAt: Date;
  try {
    const { computeDealStateVector } = await import("@/lib/engines/perception");
    const { computeRevenueState } = await import("@/lib/revenue-state");
    const vector = await computeDealStateVector(workspaceId, leadId);
    if (vector) {
      const rev = computeRevenueState(vector);
      if (rev.transition_toward_risk_at) {
        nextAt = new Date(rev.transition_toward_risk_at);
      } else {
        nextAt = new Date();
        nextAt.setHours(nextAt.getHours() + Math.max(1, nextStep.delay_hours * mult));
      }
    } else {
      nextAt = new Date();
      nextAt.setHours(nextAt.getHours() + Math.max(1, nextStep.delay_hours * mult));
    }
  } catch {
    nextAt = new Date();
    nextAt.setHours(nextAt.getHours() + Math.max(1, nextStep.delay_hours * mult));
  }

  await db
    .from("sequence_runs")
    .update({
      current_step: r.current_step + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId);

  await setLeadPlan(workspaceId, leadId, {
    next_action_type: nextStep.intervention_type,
    next_action_at: nextAt.toISOString(),
    sequence_id: r.sequence_id,
    sequence_step: nextStep.step,
  });

  return { advanced: true, nextStep, nextActionAt: nextAt.toISOString() };
}

/** Stop sequence on reply, opt-out, escalation hold, booked, etc. */
export async function stopSequence(
  workspaceId: string,
  leadId: string,
  reason: string
): Promise<void> {
  const db = getDb();
  const { cancelLeadPlan } = await import("@/lib/plans/lead-plan");
  await cancelLeadPlan(workspaceId, leadId, reason);
  await db
    .from("sequence_runs")
    .update({ status: "stopped", stopped_reason: reason, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId);
}
