/**
 * Institutional auditability: post-reliance changes become visible.
 * We do not prevent changes. We make them observable. No blame, no actor, no technical detail.
 */

import { getDb } from "@/lib/db/queries";
import { crossPartyRelianceEstablished } from "@/lib/operational-responsibilities";

export type AmendmentType =
  | "state_change"
  | "outcome_change"
  | "evidence_change"
  | "responsibility_change";

/** Deterministic: true when ANY of — workspace cross-party reliance, outcome_dependency for thread, reference_memory for thread, evidence by counterparty/downstream, responsibility satisfied by non-originator. */
export async function threadIsReliedUpon(threadId: string): Promise<boolean> {
  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("workspace_id")
    .eq("id", threadId)
    .maybeSingle();
  const workspaceId = (row as { workspace_id: string } | null)?.workspace_id;
  if (!workspaceId) return false;

  if (await crossPartyRelianceEstablished(workspaceId)) return true;

  const { data: dep } = await db
    .from("outcome_dependencies")
    .select("id")
    .eq("source_thread_id", threadId)
    .limit(1)
    .maybeSingle();
  if (dep) return true;

  const { data: ref } = await db
    .from("thread_reference_memory")
    .select("id")
    .eq("thread_id", threadId)
    .limit(1)
    .maybeSingle();
  if (ref) return true;

  const { data: ev } = await db
    .from("thread_evidence")
    .select("id")
    .eq("thread_id", threadId)
    .in("actor_role", ["counterparty", "downstream"])
    .limit(1)
    .maybeSingle();
  if (ev) return true;

  const { data: resp } = await db
    .from("operational_responsibilities")
    .select("id")
    .eq("thread_id", threadId)
    .eq("satisfied", true)
    .neq("assigned_role", "originator")
    .limit(1)
    .maybeSingle();
  if (resp) return true;

  return false;
}

/**
 * Append one amendment. Call only when the thread is or was relied upon; caller decides.
 * No deletes. Consequence only.
 */
export async function recordThreadAmendment(
  threadId: string,
  type: AmendmentType,
  summary: string,
  eventId?: string | null
): Promise<void> {
  const db = getDb();
  const capped = summary.slice(0, 200).trim() || "Change recorded.";
  await db.from("thread_amendments").insert({
    thread_id: threadId,
    amendment_type: type,
    amendment_summary: capped,
    caused_by_event_id: eventId ?? null,
  });
}

/** True if thread has at least one amendment. */
export async function threadHasAmendment(threadId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("thread_amendments")
    .select("id")
    .eq("thread_id", threadId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** True if workspace has any amendment in the last 24 hours (for settlement). Deterministic. */
export async function workspaceHasAmendmentInLast24h(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (!threads?.length) return false;
  const threadIds = (threads as { id: string }[]).map((t) => t.id);
  const { data } = await db
    .from("thread_amendments")
    .select("id")
    .in("thread_id", threadIds)
    .gte("recorded_at", since)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** True if workspace has any relied-upon thread with at least one amendment (for presence). */
export async function workspaceHasReliedThreadWithAmendment(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (!threads?.length) return false;
  for (const t of threads as { id: string }[]) {
    const [relied, amended] = await Promise.all([
      threadIsReliedUpon(t.id),
      threadHasAmendment(t.id),
    ]);
    if (relied && amended) return true;
  }
  return false;
}

/** Doctrine: public work when thread has amendments. ≤90 chars. */
export const STATEMENT_RECORD_UPDATED_AFTER_RELIANCE =
  "This record was later updated after reliance.";

/** Doctrine: presence when any relied thread has amendment. ≤90 chars. */
export const STATEMENT_PAST_ACTIVITY_POST_RELIANCE_UPDATES =
  "Past activity includes post-reliance updates.";

/** Doctrine: proof capsule when amendment in period. ≤90 chars. */
export const STATEMENT_EARLIER_ACTIVITY_AMENDED =
  "Earlier recorded activity was subsequently amended.";

/** Amendment line for record log. No blame, no actor. ≤90 chars. */
const AMENDMENT_LOG_LINE = "Record was amended.";

const MAX_LINE = 90;
function cap(s: string): string {
  return s.length > MAX_LINE ? s.slice(0, MAX_LINE).trim() : s;
}

/** Doctrine-safe amendment lines for a thread (recorded_at order). Merge with continuation for chronological log. */
export async function getAmendmentLinesForThread(threadId: string): Promise<{ recorded_at: string; line: string }[]> {
  const db = getDb();
  const { data } = await db
    .from("thread_amendments")
    .select("recorded_at")
    .eq("thread_id", threadId)
    .order("recorded_at", { ascending: true });
  return (data ?? []).map((r: { recorded_at: string }) => ({
    recorded_at: r.recorded_at,
    line: cap(AMENDMENT_LOG_LINE),
  }));
}