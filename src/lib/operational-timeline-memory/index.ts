/**
 * Passage of time anchoring: consecutive operational days when orientation produced.
 * No counts in API output; boolean only.
 */

import { getDb } from "@/lib/db/queries";

const MIN_CONSECUTIVE_FOR_CONTINUOUS = 5;

/** Call when at least one orientation record is produced for the workspace today (UTC). */
export async function recordOperationalDay(workspaceId: string): Promise<void> {
  const db = getDb();
  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);

  const { data: row } = await db
    .from("operational_timeline_memory")
    .select("last_seen_operational_day, consecutive_operational_days")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!row) {
    await db.from("operational_timeline_memory").insert({
      workspace_id: workspaceId,
      last_seen_operational_day: todayDate,
      consecutive_operational_days: 1,
      created_at: new Date().toISOString(),
    });
    return;
  }

  const last = (row as { last_seen_operational_day: string; consecutive_operational_days: number }).last_seen_operational_day;
  const prevConsec = (row as { consecutive_operational_days: number }).consecutive_operational_days;

  if (last === todayDate) return;
  const nextConsec = last === yesterdayDate ? prevConsec + 1 : 1;
  await db
    .from("operational_timeline_memory")
    .update({
      last_seen_operational_day: todayDate,
      consecutive_operational_days: nextConsec,
    })
    .eq("workspace_id", workspaceId);
}

export async function getContinuityDuration(workspaceId: string): Promise<{
  operations_have_been_continuous: boolean;
}> {
  const db = getDb();
  const { data: row } = await db
    .from("operational_timeline_memory")
    .select("consecutive_operational_days")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const days = (row as { consecutive_operational_days?: number } | null)?.consecutive_operational_days ?? 0;
  return {
    operations_have_been_continuous: days >= MIN_CONSECUTIVE_FOR_CONTINUOUS,
  };
}
