/**
 * Installation phase: observing (48h no automation) → activation_ready → active (after snapshot view).
 * Delegates to canonical installation lib; exposes legacy row shape for backward compat.
 */

import {
  getInstallationState as getInstallationStateCanonical,
  ensureWorkspaceInstallationState,
  transitionInstallationPhase,
  setSnapshotSeen,
} from "@/lib/installation";
import type { InstallationStateRow } from "@/lib/installation";

export type InstallationPhase = "observing" | "activation_ready" | "active";

export interface WorkspaceInstallationRow {
  workspace_id: string;
  phase: InstallationPhase;
  observation_started_at: string | null;
  activation_at: string | null;
  snapshot_viewed_at: string | null;
}

function mapToLegacyRow(row: InstallationStateRow | null): WorkspaceInstallationRow | null {
  if (!row) return null;
  return {
    workspace_id: row.workspace_id,
    phase: row.phase,
    observation_started_at: row.observation_started_at,
    activation_at: row.activated_at,
    snapshot_viewed_at: row.snapshot_seen_at,
  };
}

export async function getInstallationState(workspaceId: string): Promise<WorkspaceInstallationRow | null> {
  const state = await getInstallationStateCanonical(workspaceId);
  return mapToLegacyRow(state);
}

export async function ensureInstallationState(
  workspaceId: string,
  options: { messagingConnected: boolean; paymentsConnected: boolean }
): Promise<WorkspaceInstallationRow> {
  if (options.messagingConnected || options.paymentsConnected) {
    const state = await ensureWorkspaceInstallationState(workspaceId);
    return mapToLegacyRow(state)!;
  }
  const existing = await getInstallationStateCanonical(workspaceId);
  if (existing) return mapToLegacyRow(existing)!;
  const state = await ensureWorkspaceInstallationState(workspaceId);
  return mapToLegacyRow(state)!;
}

/** True if automation (outbound, recovery) is allowed. */
export async function isAutomationAllowed(workspaceId: string): Promise<boolean> {
  const state = await getInstallationStateCanonical(workspaceId);
  if (!state) return false;
  return state.phase === "active";
}

/** Workspace IDs where phase = active (for cron filtering). */
export async function getWorkspaceIdsWithAutomationAllowed(): Promise<Set<string>> {
  const { getDb } = await import("@/lib/db/queries");
  const db = getDb();
  const { data } = await db
    .from("workspace_installation_state")
    .select("workspace_id")
    .eq("phase", "active");
  return new Set((data ?? []).map((r: { workspace_id: string }) => r.workspace_id));
}

/** Mark snapshot as viewed and set phase to active. */
export async function markSnapshotViewed(workspaceId: string): Promise<void> {
  await setSnapshotSeen(workspaceId);
}

/** Advance observing → activation_ready after 48h (idempotent). */
export async function advanceObservationPhaseIfDue(workspaceId: string): Promise<void> {
  await transitionInstallationPhase(workspaceId);
}
