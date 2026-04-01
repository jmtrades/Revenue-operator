/**
 * Confidence Engine: controls WHEN enforcement engines are allowed to act.
 * Phases: observing | simulating | assisted | autonomous.
 * Gate outbound execution without modifying engine internals.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

export type ConfidencePhase = "observing" | "simulating" | "assisted" | "autonomous";

export interface ConfidenceState {
  phase: ConfidencePhase;
  simulations_present: boolean;
  approvals_required: boolean;
  stability_established: boolean;
}

/** Get confidence phase for workspace. Default observing if no row. */
export async function getConfidencePhase(workspaceId: string): Promise<ConfidencePhase> {
  const db = getDb();
  const { data } = await db
    .from("workspace_installation_state")
    .select("confidence_phase")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const phase = (data as { confidence_phase?: string | null } | null)?.confidence_phase ?? null;
  if (phase && ["observing", "simulating", "assisted", "autonomous"].includes(phase)) {
    return phase as ConfidencePhase;
  }
  return "observing";
}

/** Set confidence phase. Idempotent. */
export async function setConfidencePhase(workspaceId: string, phase: ConfidencePhase): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("workspace_installation_state")
    .update({ confidence_phase: phase, updated_at: now })
    .eq("workspace_id", workspaceId);
}

/** Append operational narrative entry. No metrics, no counts. */
export async function appendNarrative(
  workspaceId: string,
  entryType: "risk_detected" | "simulation_created" | "action_executed" | "outcome_resolved" | "action_withheld" | "approval_required" | "stability_established",
  text: string
): Promise<void> {
  const db = getDb();
  await db.from("operational_narrative").insert({
    workspace_id: workspaceId,
    entry_type: entryType,
    text,
  });
}

/** Record a simulated action (phase = simulating). */
export async function recordSimulatedAction(
  workspaceId: string,
  actionType: string,
  simulatedText: string,
  relatedExternalRef?: string | null
): Promise<void> {
  const db = getDb();
  await db.from("simulated_actions").insert({
    workspace_id: workspaceId,
    action_type: actionType,
    related_external_ref: relatedExternalRef ?? null,
    simulated_text: simulatedText,
  });
  await appendNarrative(workspaceId, "simulation_created", "An action was simulated and not sent.").catch((e) => {
    log("error", "appendNarrative simulation created failed", { error: e instanceof Error ? e.message : String(e) });
  });
}

/** Whether action_type is trusted for workspace (assisted phase). */
export async function isActionTypeTrusted(workspaceId: string, actionType: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("trusted_action_types")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("action_type", actionType)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Mark action_type as trusted (after approval). */
export async function markActionTypeTrusted(workspaceId: string, actionType: string): Promise<void> {
  const db = getDb();
  const { error } = await db.from("trusted_action_types").upsert(
    { workspace_id: workspaceId, action_type: actionType, trusted_at: new Date().toISOString() },
    { onConflict: "workspace_id,action_type" }
  );
  if (error) throw new Error(error.message);
}

/** Whether workspace has any simulated_actions. */
export async function hasSimulations(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("simulated_actions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Whether workspace has any approval_required incident in last 7 days (approvals still needed). */
export async function hasApprovalsRequired(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("incident_statements")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("category", "approval_required")
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Whether stability_established narrative exists. */
export async function isStabilityEstablished(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("operational_narrative")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("entry_type", "stability_established")
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Get confidence state for API. No counts. */
export async function getConfidenceState(workspaceId: string): Promise<ConfidenceState> {
  const phase = await getConfidencePhase(workspaceId);
  const simulations_present = await hasSimulations(workspaceId);
  const approvals_required = phase === "assisted" ? await hasApprovalsRequired(workspaceId) : false;
  const stability_established = await isStabilityEstablished(workspaceId);
  return {
    phase,
    simulations_present: simulations_present,
    approvals_required: approvals_required,
    stability_established: stability_established,
  };
}
