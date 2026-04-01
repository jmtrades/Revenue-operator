/**
 * Record coordination displacement when an expected human clarification step did not occur.
 * afterIntervention: true when intervention preceded outcome; false when outcome occurred without intervention.
 */

import { getDb } from "@/lib/db/queries";
import type { ActorType, DecisionType } from "./types";
import { log } from "@/lib/logger";

const logCoordinationDisplacementSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `coordination-displacement.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

/**
 * Record that a decision was made using the environment (relied_on_environment = true only).
 */
export async function recordCoordinationDisplacement(
  workspaceId: string,
  actorType: ActorType,
  decisionType: DecisionType,
  afterIntervention: boolean = true
): Promise<void> {
  const db = getDb();
  const recordedAt = new Date().toISOString();
  await db.from("coordination_displacement_events").insert({
    workspace_id: workspaceId,
    actor_type: actorType,
    decision_type: decisionType,
    relied_on_environment: true,
    after_intervention: afterIntervention,
    recorded_at: recordedAt,
  });
  const { recordContinuityLoad } = await import("@/lib/continuity-load");
  recordContinuityLoad(
    workspaceId,
    "coordination_displaced",
    `${actorType}:${decisionType}:${recordedAt.slice(0, 19)}`
  ).catch(logCoordinationDisplacementSideEffect("record-continuity-load"));
  const { resolveExposureFromDisplacement } = await import("@/lib/exposure-engine");
  resolveExposureFromDisplacement(workspaceId, decisionType).catch(logCoordinationDisplacementSideEffect("resolve-exposure"));
}

export async function countDisplacementInLastDays(workspaceId: string, days: number): Promise<number> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { count } = await db
    .from("coordination_displacement_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("relied_on_environment", true)
    .gte("recorded_at", since.toISOString());
  return count ?? 0;
}

/** True if at least one counterparty displacement with decision_type 'confirmation' in last N days. */
export async function hasCounterpartyConfirmationDisplacementInLastDays(
  workspaceId: string,
  days: number
): Promise<boolean> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { count } = await db
    .from("coordination_displacement_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("actor_type", "counterparty")
    .eq("decision_type", "confirmation")
    .eq("relied_on_environment", true)
    .gte("recorded_at", since.toISOString());
  return (count ?? 0) >= 1;
}

const LINE_AFTER_INTERVENTION: Record<DecisionType, string> = {
  attendance: "Participants acted without reconfirmation.",
  payment: "Payment followed recorded terms.",
  responsibility: "Responsibility was clarified through the record.",
  confirmation: "Work proceeded without manual clarification.",
  continuation: "Work proceeded without manual clarification.",
};

const LINE_WITHOUT_INTERVENTION: Record<DecisionType, string> = {
  attendance: "A schedule was confirmed without follow-up.",
  payment: "Payment completed without manual chasing.",
  responsibility: "Responsibility was clarified through the record.",
  confirmation: "A shared record was confirmed without prompting.",
  continuation: "A conversation continued without re-engagement.",
};

const MAX_LINE_LEN = 90;

function trim(s: string): string {
  return s.length > MAX_LINE_LEN ? s.slice(0, MAX_LINE_LEN).trim() : s;
}

/**
 * Factual lines for displacement in last N days. No numbers. Deduplicated.
 */
export async function getDisplacementLinesInLastDays(workspaceId: string, days: number): Promise<string[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data: rows } = await db
    .from("coordination_displacement_events")
    .select("decision_type, after_intervention")
    .eq("workspace_id", workspaceId)
    .eq("relied_on_environment", true)
    .gte("recorded_at", since.toISOString());

  const seen = new Set<string>();
  for (const r of rows ?? []) {
    const row = r as { decision_type: string; after_intervention: boolean };
    const dt = row.decision_type as DecisionType;
    const after = row.after_intervention !== false;
    const line = after ? LINE_AFTER_INTERVENTION[dt] : LINE_WITHOUT_INTERVENTION[dt];
    if (line) seen.add(trim(line));
  }
  const order: string[] = [
    LINE_AFTER_INTERVENTION.attendance,
    LINE_WITHOUT_INTERVENTION.attendance,
    LINE_AFTER_INTERVENTION.payment,
    LINE_WITHOUT_INTERVENTION.payment,
    LINE_AFTER_INTERVENTION.responsibility,
    LINE_WITHOUT_INTERVENTION.confirmation,
    LINE_AFTER_INTERVENTION.confirmation,
    LINE_AFTER_INTERVENTION.continuation,
    LINE_WITHOUT_INTERVENTION.continuation,
  ];
  const out: string[] = [];
  for (const line of order) {
    const t = trim(line);
    if (seen.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
}
