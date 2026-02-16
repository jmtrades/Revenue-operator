/**
 * Staff operational reliance: handoff ack, authority resolved, shared record, outcome after escalation.
 * No counts in API; boolean only.
 */

import { getDb } from "@/lib/db/queries";

const MIN_EVENTS = 3;
const MIN_DAYS_SPAN = 1;

export async function recordStaffRelianceEvent(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: row } = await db
    .from("staff_operational_reliance")
    .select("first_reliance_at, last_reliance_at, reliance_events")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!row) {
    await db.from("staff_operational_reliance").insert({
      workspace_id: workspaceId,
      first_reliance_at: now,
      last_reliance_at: now,
      reliance_events: 1,
    });
    return;
  }

  const r = row as { first_reliance_at: string; last_reliance_at: string; reliance_events: number };
  await db
    .from("staff_operational_reliance")
    .update({
      last_reliance_at: now,
      reliance_events: r.reliance_events + 1,
    })
    .eq("workspace_id", workspaceId);
}

export async function getStaffReliance(workspaceId: string): Promise<{
  staff_using_environment_for_coordination: boolean;
}> {
  const db = getDb();
  const { data: row } = await db
    .from("staff_operational_reliance")
    .select("first_reliance_at, last_reliance_at, reliance_events")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!row) {
    return { staff_using_environment_for_coordination: false };
  }

  const r = row as { first_reliance_at: string; last_reliance_at: string; reliance_events: number };
  if (r.reliance_events < MIN_EVENTS) {
    return { staff_using_environment_for_coordination: false };
  }

  const firstDate = new Date(r.first_reliance_at).toISOString().slice(0, 10);
  const lastDate = new Date(r.last_reliance_at).toISOString().slice(0, 10);
  const daysSpan = firstDate !== lastDate;
  return {
    staff_using_environment_for_coordination: daysSpan,
  };
}
