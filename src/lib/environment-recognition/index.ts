/**
 * Cross-party recognition: two different counterparties acknowledged in window.
 */

import { getDb } from "@/lib/db/queries";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function refreshEnvironmentRecognition(workspaceId: string): Promise<void> {
  const db = getDb();
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const { data: rows } = await db
    .from("shared_transactions")
    .select("counterparty_identifier")
    .eq("workspace_id", workspaceId)
    .eq("state", "acknowledged")
    .gte("acknowledged_at", since);
  const distinct = new Set((rows ?? []).map((r: { counterparty_identifier: string }) => r.counterparty_identifier));
  const recognized = distinct.size >= 2;
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("environment_recognition")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (existing) {
    await db
      .from("environment_recognition")
      .update({ recognized, last_updated_at: now })
      .eq("workspace_id", workspaceId);
  } else {
    await db.from("environment_recognition").insert({
      workspace_id: workspaceId,
      recognized,
      last_updated_at: now,
    });
  }
}

export async function getExternalRecognition(workspaceId: string): Promise<{
  recognized_as_shared_process: boolean;
}> {
  await refreshEnvironmentRecognition(workspaceId);
  const db = getDb();
  const { data: row } = await db
    .from("environment_recognition")
    .select("recognized")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return {
    recognized_as_shared_process: (row as { recognized?: boolean } | null)?.recognized ?? false,
  };
}
