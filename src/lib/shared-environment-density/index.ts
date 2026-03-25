/**
 * Shared environment density: external participants count in window.
 * Used for environment-presence API.
 */

import { getDb } from "@/lib/db/queries";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function refreshSharedEnvironmentDensity(workspaceId: string): Promise<void> {
  const db = getDb();
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const [createdRows, ackRows] = await Promise.all([
    db.from("shared_transactions").select("counterparty_identifier").eq("workspace_id", workspaceId).gte("created_at", since),
    db.from("shared_transactions").select("counterparty_identifier").eq("workspace_id", workspaceId).gte("acknowledged_at", since),
  ]);
  const distinct = new Set([
    ...(createdRows.data ?? []).map((r: { counterparty_identifier: string }) => r.counterparty_identifier),
    ...(ackRows.data ?? []).map((r: { counterparty_identifier: string }) => r.counterparty_identifier),
  ]);
  const count = distinct.size;
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("shared_environment_density")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (existing) {
    await db
      .from("shared_environment_density")
      .update({ external_participants_count: count, last_updated_at: now })
      .eq("workspace_id", workspaceId);
  } else {
    await db.from("shared_environment_density").insert({
      workspace_id: workspaceId,
      external_participants_count: count,
      last_updated_at: now,
    });
  }
}

export async function getEnvironmentPresence(workspaceId: string): Promise<{
  coordination_outside_environment_unlikely: boolean;
}> {
  await refreshSharedEnvironmentDensity(workspaceId);
  const db = getDb();
  const { data: row } = await db
    .from("shared_environment_density")
    .select("external_participants_count")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const count = (row as { external_participants_count?: number } | null)?.external_participants_count ?? 0;
  return {
    coordination_outside_environment_unlikely: count >= 2,
  };
}
