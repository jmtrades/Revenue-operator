/**
 * Webhook Inbox connector: append-only. Cron maps to canonical signals.
 */

import { getDb } from "@/lib/db/queries";

export interface ConnectorInboxPayload {
  workspace_id: string;
  kind: string;
  data: Record<string, unknown>;
  occurred_at?: string;
}

export async function appendConnectorInboxEvent(
  workspaceId: string,
  kind: string,
  data: Record<string, unknown>,
  occurredAt: string
): Promise<string> {
  const db = getDb();
  const { data: row } = await db
    .from("connector_inbox_events")
    .insert({
      workspace_id: workspaceId,
      kind,
      data: data ?? {},
      occurred_at: occurredAt,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  return (row as { id: string }).id;
}

export async function getUnprocessedInboxEvents(limit: number): Promise<
  Array<{ id: string; workspace_id: string; kind: string; data: Record<string, unknown>; occurred_at: string }>
> {
  const db = getDb();
  const { data: events } = await db
    .from("connector_inbox_events")
    .select("id, workspace_id, kind, data, occurred_at")
    .order("occurred_at", { ascending: true })
    .limit(Math.min(limit * 3, 200));
  if (!events?.length) return [];
  const eventIds = (events as { id: string }[]).map((e) => e.id);
  const { data: processedRows } = await db.from("connector_inbox_event_state").select("id").in("id", eventIds);
  const processedSet = new Set(((processedRows ?? []) as { id: string }[]).map((r) => r.id));
  return (events as { id: string; workspace_id: string; kind: string; data: Record<string, unknown>; occurred_at: string }[])
    .filter((e) => !processedSet.has(e.id))
    .slice(0, limit);
}

export async function markInboxEventProcessed(eventId: string): Promise<void> {
  const db = getDb();
  await db.from("connector_inbox_event_state").insert({
    id: eventId,
    processed_at: new Date().toISOString(),
  });
}
