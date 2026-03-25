/**
 * Counterparty participation state and operational dependency.
 * No UI. No marketing. Operational necessity only.
 */

import { getDb } from "@/lib/db/queries";

export type ParticipationState = "external" | "interacting" | "reliant" | "participant";
export type DependencyType =
  | "coordination_required"
  | "confirmation_required"
  | "payment_required"
  | "outcome_required";

const STATE_ORDER: ParticipationState[] = ["external", "interacting", "reliant", "participant"];

function maxState(a: ParticipationState, b: ParticipationState): ParticipationState {
  return STATE_ORDER.indexOf(a) >= STATE_ORDER.indexOf(b) ? a : b;
}

/**
 * Upsert participation from incoming_entry: set at least interacting, update last_entry_at, recompute state.
 */
export async function upsertParticipationFromIncomingEntry(
  workspaceId: string,
  counterpartyIdentifier: string,
  now: string
): Promise<void> {
  const db = getDb();
  const { data: row } = await db
    .from("counterparty_participation")
    .select("id, first_entry_at, participation_state")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .maybeSingle();

  if (!row) {
    await db.from("counterparty_participation").insert({
      workspace_id: workspaceId,
      counterparty_identifier: counterpartyIdentifier,
      participation_state: "interacting",
      first_entry_at: now,
      last_entry_at: now,
    });
  } else {
    await db
      .from("counterparty_participation")
      .update({
        last_entry_at: now,
        participation_state: "interacting",
        ...(!(row as { first_entry_at: string | null }).first_entry_at && { first_entry_at: now }),
      })
      .eq("workspace_id", workspaceId)
      .eq("counterparty_identifier", counterpartyIdentifier);
  }

  await recomputeParticipationState(workspaceId, counterpartyIdentifier);
}

async function recomputeParticipationState(
  workspaceId: string,
  counterpartyIdentifier: string
): Promise<void> {
  const db = getDb();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const originId = counterpartyIdentifier.startsWith("workspace:")
    ? counterpartyIdentifier.slice("workspace:".length)
    : null;
  let count7d = 0;
  if (originId) {
    const { count } = await db
      .from("incoming_entries")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("origin_workspace_id", originId)
      .gte("last_event_at", since7d);
    count7d = count ?? 0;
  }
  const { data: txRefs } = await db
    .from("shared_transactions")
    .select("external_ref")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier);
  const refs = (txRefs ?? []).map((r: { external_ref: string }) => r.external_ref);
  let hasAck = false;
  let hasDispute = false;
  let hasReschedule = false;
  if (refs.length > 0) {
    const { data: ev } = await db
      .from("protocol_events")
      .select("event_type")
      .in("external_ref", refs)
      .in("event_type", ["acknowledged", "disputed", "rescheduled"]);
    const types = new Set((ev ?? []).map((e: { event_type: string }) => e.event_type));
    hasAck = types.has("acknowledged");
    hasDispute = types.has("disputed");
    hasReschedule = types.has("rescheduled");
  }

  let newState: ParticipationState = "interacting";
  if (hasAck && hasDispute && hasReschedule) newState = "participant";
  else if (count7d >= 3) newState = "reliant";

  await db
    .from("counterparty_participation")
    .update({ participation_state: newState })
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier);
}

/**
 * Insert operational dependency row. Idempotent per (workspace_id, external_ref, dependency_type) if desired; spec says insert when events occur.
 */
export async function insertOperationalDependency(
  workspaceId: string,
  externalRef: string | null,
  dependencyType: DependencyType
): Promise<void> {
  const db = getDb();
  await db.from("operational_dependency").insert({
    workspace_id: workspaceId,
    external_ref: externalRef,
    dependency_type: dependencyType,
  });
}

/**
 * Participation state for (workspace_id, counterparty_identifier).
 */
export async function getParticipationState(
  workspaceId: string,
  counterpartyIdentifier: string
): Promise<ParticipationState> {
  const db = getDb();
  const { data: row } = await db
    .from("counterparty_participation")
    .select("participation_state")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .maybeSingle();
  return ((row as { participation_state: ParticipationState } | null)?.participation_state) ?? "external";
}

/**
 * True if workspace has any operational_dependency.
 */
export async function hasOutstandingDependenciesForWorkspace(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { count } = await db
    .from("operational_dependency")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  return (count ?? 0) > 0;
}

/**
 * Public environment state by counterparty_identifier (may span workspaces). No product messaging.
 */
export async function getPublicEnvironmentState(
  counterpartyIdentifier: string
): Promise<{ participation_state: ParticipationState; outstanding_dependencies: boolean }> {
  const db = getDb();
  const idn = counterpartyIdentifier.trim();
  if (!idn) {
    return { participation_state: "external", outstanding_dependencies: false };
  }

  const { data: rows } = await db
    .from("counterparty_participation")
    .select("workspace_id, participation_state")
    .eq("counterparty_identifier", idn);
  const list = (rows ?? []) as { workspace_id: string; participation_state: ParticipationState }[];
  if (list.length === 0) {
    return { participation_state: "external", outstanding_dependencies: false };
  }

  let state: ParticipationState = "external";
  const workspaceIds = list.map((r) => r.workspace_id);
  for (const r of list) state = maxState(state, r.participation_state);

  let outstanding = false;
  for (const wid of workspaceIds) {
    const has = await hasOutstandingDependenciesForWorkspace(wid);
    if (has) {
      outstanding = true;
      break;
    }
  }
  return { participation_state: state, outstanding_dependencies: outstanding };
}

/**
 * True if any operational_dependency exists for workspace (for GET /api/responsibility).
 */
export async function hasExternalDependenciesForWorkspace(workspaceId: string): Promise<boolean> {
  return hasOutstandingDependenciesForWorkspace(workspaceId);
}
