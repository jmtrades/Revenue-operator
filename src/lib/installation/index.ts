/**
 * Installation gating: observing → activation_ready → active.
 * Single source of truth for phase transitions and observed risk recording.
 */

import { getDb } from "@/lib/db/queries";

const OBSERVATION_HOURS = 48;

export type InstallationPhase = "observing" | "activation_ready" | "active";

export interface InstallationStateRow {
  workspace_id: string;
  phase: InstallationPhase;
  observation_started_at: string | null;
  activation_ready_at: string | null;
  activated_at: string | null;
  snapshot_generated_at: string | null;
  snapshot_seen_at: string | null;
}

export async function getInstallationState(workspaceId: string): Promise<InstallationStateRow | null> {
  const db = getDb();
  const { data } = await db
    .from("workspace_installation_state")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    workspace_id: r.workspace_id as string,
    phase: r.phase as InstallationPhase,
    observation_started_at: (r.observation_started_at as string) ?? null,
    activation_ready_at: (r.activation_ready_at as string) ?? null,
    activated_at: (r.activated_at as string) ?? (r.activation_at as string) ?? null,
    snapshot_generated_at: (r.snapshot_generated_at as string) ?? null,
    snapshot_seen_at: (r.snapshot_seen_at as string) ?? (r.snapshot_viewed_at as string) ?? null,
  };
}

export async function ensureWorkspaceInstallationState(workspaceId: string): Promise<InstallationStateRow> {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = await getInstallationState(workspaceId);
  if (existing) return existing;

  await db.from("workspace_installation_state").insert({
    workspace_id: workspaceId,
    phase: "observing",
    observation_started_at: now,
    updated_at: now,
  });
  const row = await getInstallationState(workspaceId);
  if (!row) throw new Error("Failed to read installation state after insert");
  return row;
}

/**
 * Transition: observing → activation_ready after 48h;
 * activation_ready → active when snapshot_seen_at set AND at least one immediate_risk_event exists.
 * Idempotent. Call from cron and after snapshot/seen.
 */
export async function transitionInstallationPhase(workspaceId: string): Promise<InstallationStateRow | null> {
  const db = getDb();
  const now = new Date().toISOString();
  const state = await getInstallationState(workspaceId);
  if (!state) return null;

  if (state.phase === "observing" && state.observation_started_at) {
    const started = new Date(state.observation_started_at).getTime();
    if (Date.now() - started >= OBSERVATION_HOURS * 60 * 60 * 1000) {
      await db
        .from("workspace_installation_state")
        .update({
          phase: "activation_ready",
          activation_ready_at: now,
          updated_at: now,
        })
        .eq("workspace_id", workspaceId);
      return { ...state, phase: "activation_ready", activation_ready_at: now };
    }
  }

  if (state.phase === "activation_ready" && state.snapshot_seen_at) {
    const { countUnresolvedImmediateRisks } = await import("@/lib/immediate-risk");
    const riskCount = await countUnresolvedImmediateRisks(workspaceId);
    if (riskCount >= 1) {
      const { getConfidencePhase } = await import("@/lib/confidence-engine");
      const confPhase = await getConfidencePhase(workspaceId);
      const nextConfidence = confPhase === "observing" ? "simulating" : confPhase;
      await db
        .from("workspace_installation_state")
        .update({
          phase: "active",
          activated_at: now,
          confidence_phase: nextConfidence,
          updated_at: now,
        })
        .eq("workspace_id", workspaceId);
      return { ...state, phase: "active", activated_at: now };
    }
  }

  return state;
}

export type ObservedRiskType =
  | "stalled_commitment"
  | "unresponded_conversation"
  | "missed_confirmation"
  | "overdue_payment"
  | "stalled_opportunity"
  | "slowed_opportunity";

/**
 * Record observed risk. Idempotent by (workspace_id, risk_type, subject_type, subject_id, day).
 */
export async function recordObservedRiskEvent(
  workspaceId: string,
  riskType: ObservedRiskType,
  subjectType: string,
  subjectId: string,
  relatedExternalRef?: string | null
): Promise<void> {
  const db = getDb();
  const { error } = await db.from("observed_risk_events").insert({
    workspace_id: workspaceId,
    risk_type: riskType,
    subject_type: subjectType,
    subject_id: subjectId,
    prevented_if_active: true,
    related_external_ref: relatedExternalRef ?? null,
  });
  if (error?.code === "23505") return;
  if (error) throw new Error(error.message);
}

/**
 * Generate 1–3 institutional sentences from observed_risk_events (last 7 days).
 * Inserts into installation_snapshots and sets snapshot_generated_at.
 */
export async function generateInstallationSnapshot(workspaceId: string): Promise<string> {
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("observed_risk_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("detected_at", since);
  const n = count ?? 0;

  let snapshot_text: string;
  if (n === 0) {
    snapshot_text = "Activation is now available.";
  } else if (n === 1) {
    snapshot_text = "Recent interactions required manual attention to avoid loss. Activation is now available.";
  } else {
    snapshot_text = "Commitments and payments contained unresolved states. Activation is now available.";
  }

  await db.from("installation_snapshots").insert({
    workspace_id: workspaceId,
    snapshot_text,
  });

  const now = new Date().toISOString();
  await db
    .from("workspace_installation_state")
    .update({ snapshot_generated_at: now, updated_at: now })
    .eq("workspace_id", workspaceId);

  return snapshot_text;
}

/** Set snapshot as seen. Idempotent. Activation (phase → active) happens in transitionInstallationPhase when snapshot_seen_at and ≥1 immediate_risk_event. */
export async function setSnapshotSeen(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("workspace_installation_state")
    .update({
      snapshot_seen_at: now,
      updated_at: now,
    })
    .eq("workspace_id", workspaceId);
}

/** Get latest snapshot text for workspace (from installation_snapshots). */
export async function getLatestSnapshotText(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("installation_snapshots")
    .select("snapshot_text")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { snapshot_text?: string } | null)?.snapshot_text ?? null;
}

/** All workspace IDs that have an installation state row (any phase). */
export async function getWorkspaceIdsWithInstallationState(): Promise<Set<string>> {
  const db = getDb();
  const { data } = await db.from("workspace_installation_state").select("workspace_id");
  return new Set((data ?? []).map((r: { workspace_id: string }) => r.workspace_id));
}
