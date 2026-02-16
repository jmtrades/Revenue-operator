/**
 * Record when the record is referenced as authority. No IDs in outputs.
 */

import { getDb } from "@/lib/db/queries";
import type { RecordReferenceActor, RecordReferenceType } from "./types";

export async function recordRecordReference(
  workspaceId: string,
  actorType: RecordReferenceActor,
  referenceType: RecordReferenceType,
  externalRef: string
): Promise<void> {
  const db = getDb();
  await db.from("record_reference_events").insert({
    workspace_id: workspaceId,
    actor_type: actorType,
    reference_type: referenceType,
    external_ref: externalRef,
    recorded_at: new Date().toISOString(),
  });
}

export async function countReferencesInLastDays(workspaceId: string, days: number): Promise<number> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { count } = await db
    .from("record_reference_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("recorded_at", since.toISOString());
  return count ?? 0;
}

/**
 * True if references exist on >=2 distinct calendar days in last N days.
 */
export async function hasReferenceAcrossDays(workspaceId: string, days: number): Promise<boolean> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data: rows } = await db
    .from("record_reference_events")
    .select("recorded_at")
    .eq("workspace_id", workspaceId)
    .gte("recorded_at", since.toISOString());
  const daysWithRef = new Set((rows ?? []).map((r: { recorded_at: string }) => r.recorded_at.slice(0, 10)));
  return daysWithRef.size >= 2;
}

const REFERENCE_LINES: Record<RecordReferenceType, string> = {
  public_record: "A participant referenced the record.",
  dashboard_record: "A participant referenced the record.",
  ack_flow: "A shared record was accessed as authority.",
};

const MAX_LINE_LEN = 90;

function trim(s: string): string {
  return s.length > MAX_LINE_LEN ? s.slice(0, MAX_LINE_LEN).trim() : s;
}

/**
 * Short factual lines for references in last N days. No timestamps, counts, or ids.
 */
export async function getRecordReferenceLinesInLastDays(workspaceId: string, days: number): Promise<string[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data: rows } = await db
    .from("record_reference_events")
    .select("reference_type")
    .eq("workspace_id", workspaceId)
    .gte("recorded_at", since.toISOString());
  const types = new Set((rows ?? []).map((r: { reference_type: string }) => r.reference_type));
  const lines: string[] = [];
  if (types.has("public_record") || types.has("dashboard_record")) lines.push(trim(REFERENCE_LINES.public_record));
  if (types.has("ack_flow")) lines.push(trim(REFERENCE_LINES.ack_flow));
  return [...new Set(lines)];
}
