/**
 * Relationship continuity: persistent state between workspace and counterparty.
 * High reliability → reduce verification friction; low → increase confirmation enforcement.
 */

import { getDb } from "@/lib/db/queries";

export type ReliabilityLevel = "unknown" | "low" | "medium" | "high";

export interface RelationshipStateRow {
  workspace_id: string;
  counterparty_identifier: string;
  interaction_reliability: ReliabilityLevel;
  response_reciprocity: ReliabilityLevel;
  completion_reliability: ReliabilityLevel;
  dispute_frequency: ReliabilityLevel;
  payment_consistency: ReliabilityLevel;
  updated_at: string;
}

/** Upsert relationship state. */
export async function upsertRelationshipState(
  workspaceId: string,
  counterpartyIdentifier: string,
  updates: Partial<Record<keyof Omit<RelationshipStateRow, "workspace_id" | "counterparty_identifier" | "updated_at">, ReliabilityLevel>>
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("relationship_state")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .maybeSingle();
  const current = (existing ?? {}) as Record<string, unknown>;
  await db.from("relationship_state").upsert(
    {
      workspace_id: workspaceId,
      counterparty_identifier: counterpartyIdentifier,
      interaction_reliability: updates.interaction_reliability ?? current.interaction_reliability ?? "unknown",
      response_reciprocity: updates.response_reciprocity ?? current.response_reciprocity ?? "unknown",
      completion_reliability: updates.completion_reliability ?? current.completion_reliability ?? "unknown",
      dispute_frequency: updates.dispute_frequency ?? current.dispute_frequency ?? "unknown",
      payment_consistency: updates.payment_consistency ?? current.payment_consistency ?? "unknown",
      updated_at: now,
    },
    { onConflict: "workspace_id,counterparty_identifier" }
  );
}

/** Get relationship state. */
export async function getRelationshipState(
  workspaceId: string,
  counterpartyIdentifier: string
): Promise<RelationshipStateRow | null> {
  const db = getDb();
  const { data } = await db
    .from("relationship_state")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .maybeSingle();
  return data as RelationshipStateRow | null;
}

/** Whether to reduce verification friction (high reliability). */
export async function shouldReduceVerificationFriction(
  workspaceId: string,
  counterpartyIdentifier: string
): Promise<boolean> {
  const state = await getRelationshipState(workspaceId, counterpartyIdentifier);
  if (!state) return false;
  const high = (s: string) => s === "high";
  const count = [state.interaction_reliability, state.response_reciprocity, state.completion_reliability, state.payment_consistency].filter(high).length;
  return count >= 3 && state.dispute_frequency !== "high";
}

/** Whether to increase confirmation enforcement (low reliability). */
export async function shouldIncreaseConfirmationEnforcement(
  workspaceId: string,
  counterpartyIdentifier: string
): Promise<boolean> {
  const state = await getRelationshipState(workspaceId, counterpartyIdentifier);
  if (!state) return false;
  const low = (s: string) => s === "low";
  return [state.completion_reliability, state.payment_consistency, state.response_reciprocity].some(low) || state.dispute_frequency === "high";
}

/** Whether workspace has any relationship state (for dependency proof). */
export async function hasRelationshipDependence(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("relationship_state")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();
  return !!data;
}
