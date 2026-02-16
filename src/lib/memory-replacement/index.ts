/**
 * Memory substitution: system did the remembering. Record when followup, payment, outcome, conversation.
 */

import { getDb } from "@/lib/db/queries";

export type MemoryReplacementEventType = "followup" | "payment_recovered" | "outcome_confirmed" | "conversation_revived";

const MAX_STATEMENT_LEN = 90;

const EVENT_TO_STATEMENT: Record<MemoryReplacementEventType, string> = {
  followup: "A previous interaction did not require remembering.",
  payment_recovered: "A payment did not require manual tracking.",
  outcome_confirmed: "An outcome did not require verification.",
  conversation_revived: "A conversation did not require re-engagement.",
};

function trim(s: string): string {
  return s.length > MAX_STATEMENT_LEN ? s.slice(0, MAX_STATEMENT_LEN).trim() : s;
}

export async function recordMemoryReplacementEvent(
  workspaceId: string,
  eventType: MemoryReplacementEventType
): Promise<void> {
  const db = getDb();
  await db.from("memory_replacement_events").insert({
    workspace_id: workspaceId,
    event_type: eventType,
    created_at: new Date().toISOString(),
  });
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getMemoryRoleStatements(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const { data: rows } = await db
    .from("memory_replacement_events")
    .select("event_type")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since);
  const types = new Set((rows ?? []).map((r: { event_type: string }) => r.event_type as MemoryReplacementEventType));
  return [...types].map((t) => trim(EVENT_TO_STATEMENT[t]));
}
