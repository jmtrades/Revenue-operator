/**
 * Objective Engine — Business outcome tracking per workspace.
 * Tracks weekly progress and classifies status (ahead | on_track | behind).
 */

import { getDb } from "@/lib/db/queries";

export type ObjectiveType = "bookings" | "revenue" | "attendance" | "pipeline_growth";
export type ObjectiveStatus = "ahead" | "on_track" | "behind";

export interface WorkspaceObjective {
  workspace_id: string;
  objective_type: ObjectiveType;
  weekly_target: number;
  current_progress: number;
  pace_required_per_day: number;
  pace_actual_per_day: number;
  status: ObjectiveStatus;
  last_evaluated_at: string;
}

/** Evaluate and persist objective status for bookings (primary metric). */
export async function evaluateWorkspaceObjective(
  workspaceId: string
): Promise<WorkspaceObjective | null> {
  const db = getDb();
  const { data: settings } = await db
    .from("settings")
    .select("weekly_call_target")
    .eq("workspace_id", workspaceId)
    .single();

  const target = (settings as { weekly_call_target?: number })?.weekly_call_target ?? 0;
  if (target < 1) return null;

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const { count: secured } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", weekEnd.toISOString());

  const currentProgress = secured ?? 0;
  const daysElapsed = Math.min(7, Math.max(1, Math.floor((now.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))));
  const daysRemaining = Math.max(1, 7 - daysElapsed);
  const gap = Math.max(0, target - currentProgress);
  const paceRequiredPerDay = gap > 0 ? gap / daysRemaining : 0;
  const paceActualPerDay = daysElapsed > 0 ? currentProgress / daysElapsed : 0;

  const expectedByNow = (target / 7) * daysElapsed;
  const variance = currentProgress - expectedByNow;
  let status: ObjectiveStatus = "on_track";
  if (variance >= 0.5) status = "ahead";
  else if (variance <= -0.5) status = "behind";

  const lastEvaluatedAt = now.toISOString();
  await db
    .from("workspace_objectives")
    .upsert(
      {
        workspace_id: workspaceId,
        objective_type: "bookings",
        weekly_target: target,
        current_progress: currentProgress,
        pace_required_per_day: paceRequiredPerDay,
        pace_actual_per_day: paceActualPerDay,
        status,
        last_evaluated_at: lastEvaluatedAt,
        updated_at: lastEvaluatedAt,
      },
      { onConflict: "workspace_id,objective_type" }
    );

  return {
    workspace_id: workspaceId,
    objective_type: "bookings",
    weekly_target: target,
    current_progress: currentProgress,
    pace_required_per_day: paceRequiredPerDay,
    pace_actual_per_day: paceActualPerDay,
    status,
    last_evaluated_at: lastEvaluatedAt,
  };
}

/** Update pace metrics from current week data. */
export async function updateWorkspacePace(workspaceId: string): Promise<void> {
  await evaluateWorkspaceObjective(workspaceId);
}

/** Evaluate expected revenue from pipeline: sum(booked * attendance_prob * close_prob * value). */
export async function evaluateRevenueObjective(
  workspaceId: string
): Promise<{ expected_revenue_cents: number; status: ObjectiveStatus } | null> {
  const db = getDb();
  const { data: deals } = await db
    .from("deals")
    .select("id, lead_id, value_cents")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"]);

  if (!deals?.length) return null;

  const leadIds = [...new Set((deals as { lead_id: string }[]).map((d) => d.lead_id))];
  const { data: outcomes } = await db
    .from("deal_outcomes")
    .select("lead_id, stage, probability")
    .eq("workspace_id", workspaceId)
    .in("lead_id", leadIds);

  const outcomeByLead = new Map<string, { stage: string; probability: number }>();
  for (const o of outcomes ?? []) {
    const row = o as { lead_id: string; stage: string; probability: number };
    outcomeByLead.set(row.lead_id, { stage: row.stage, probability: row.probability });
  }

  const { data: leads } = await db
    .from("leads")
    .select("id, state")
    .in("id", leadIds);
  const leadState = new Map<string, string>();
  for (const l of leads ?? []) {
    const row = l as { id: string; state: string };
    leadState.set(row.id, row.state);
  }

  let expectedRevenueCents = 0;
  for (const d of deals as { id: string; lead_id: string; value_cents?: number }[]) {
    const value = d.value_cents ?? 0;
    const state = leadState.get(d.lead_id) ?? "";
    const outcome = outcomeByLead.get(d.lead_id);
    const prob = outcome?.probability ?? 0.5;
    if (state === "BOOKED") {
      expectedRevenueCents += value * prob * 0.7;
    } else if (state === "SHOWED" || state === "QUALIFIED" || state === "ENGAGED") {
      expectedRevenueCents += value * prob;
    }
  }

  const { data: settings } = await db.from("settings").select("weekly_revenue_target_cents").eq("workspace_id", workspaceId).single();
  const targetCents = (settings as { weekly_revenue_target_cents?: number })?.weekly_revenue_target_cents;
  if (targetCents == null || targetCents < 1) return { expected_revenue_cents: Math.round(expectedRevenueCents), status: "on_track" };

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const daysElapsed = Math.min(7, Math.max(1, Math.floor((now.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))));
  const expectedByNow = (targetCents / 7) * daysElapsed;
  const variance = expectedRevenueCents - expectedByNow;
  const status: ObjectiveStatus = variance >= targetCents * 0.05 ? "ahead" : variance <= -targetCents * 0.05 ? "behind" : "on_track";

  await db
    .from("workspace_objectives")
    .upsert(
      {
        workspace_id: workspaceId,
        objective_type: "revenue",
        weekly_target: targetCents,
        current_progress: expectedRevenueCents,
        pace_required_per_day: 0,
        pace_actual_per_day: 0,
        status,
        last_evaluated_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: "workspace_id,objective_type" }
    );

  return { expected_revenue_cents: Math.round(expectedRevenueCents), status };
}

/** Get current objective status for workspace. */
export async function getObjectiveStatus(
  workspaceId: string
): Promise<{ status: ObjectiveStatus; objective?: WorkspaceObjective }> {
  const db = getDb();
  const { data: row } = await db
    .from("workspace_objectives")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("objective_type", "bookings")
    .single();

  if (!row) {
    const obj = await evaluateWorkspaceObjective(workspaceId);
    return {
      status: obj?.status ?? "on_track",
      objective: obj ?? undefined,
    };
  }

  const r = row as { status: ObjectiveStatus; [k: string]: unknown };
  return {
    status: r.status ?? "on_track",
    objective: row as WorkspaceObjective,
  };
}
