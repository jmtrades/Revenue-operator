/**
 * Provider detachment: true when outcomes repeatedly occurred without provider involvement.
 * Deterministic from tables only.
 */

import { getDb } from "@/lib/db/queries";

const DAYS = 7;
const MIN_NON_PARTICIPATION = 3;
const MIN_SILENCE_WINDOWS = 1;

export async function providerDetachmentEstablished(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const [npCount, swCount] = await Promise.all([
    db
      .from("non_participation_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("recorded_at", since.toISOString()),
    db
      .from("operational_silence_windows")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("ended_at", since.toISOString()),
  ]);

  return (
    (npCount?.count ?? 0) >= MIN_NON_PARTICIPATION &&
    (swCount?.count ?? 0) >= MIN_SILENCE_WINDOWS
  );
}
