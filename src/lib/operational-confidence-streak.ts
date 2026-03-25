/**
 * Long silence confidence: 30 consecutive days with no escalation, no delivery failure,
 * no progress_stalled, no signal_unprocessable → send one "No entry exists" email per streak.
 * This layer only adds trust behaviour; does not modify pipeline/reducer/guarantees.
 */

import { getDb } from "@/lib/db/queries";

/** Call whenever an escalation is logged. Sets last_break_at = now(); does not clear last_sent_at. */
export async function breakOperationalConfidenceStreak(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("operational_confidence_streak")
    .upsert(
      { workspace_id: workspaceId, last_break_at: now },
      { onConflict: "workspace_id" }
    );
}

/** For cron: workspaces where now() - last_break_at >= 30 days AND (last_sent_at is null OR last_sent_at < last_break_at). */
export async function getWorkspacesWith30DayStreak(): Promise<string[]> {
  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await db
    .from("operational_confidence_streak")
    .select("workspace_id, last_break_at, last_sent_at")
    .lt("last_break_at", thirtyDaysAgo);
  const out: string[] = [];
  for (const r of (rows ?? []) as { workspace_id: string; last_break_at: string; last_sent_at: string | null }[]) {
    if (r.last_sent_at == null || r.last_sent_at < r.last_break_at) out.push(r.workspace_id);
  }
  return out;
}

/** Record that we sent the "No entry exists" email for this streak. */
export async function markStreakEmailSent(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("operational_confidence_streak")
    .update({ last_sent_at: now })
    .eq("workspace_id", workspaceId);
}
