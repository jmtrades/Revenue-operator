/**
 * Temporal stability detectors: deterministic queries over last 7 days.
 * MIN_THREADS and MIN_DAYS must be satisfied. No deletes. UTC date truncation.
 */

import { getDb } from "@/lib/db/queries";
import type { StabilityType } from "./doctrine";
import { upsertStabilityRecord } from "./record";

export const MIN_THREADS = 3;
export const MIN_DAYS = 2;
const WINDOW_DAYS = 7;

/** UTC date string (YYYY-MM-DD) from ISO timestamp. */
function utcDate(iso: string): string {
  return iso.slice(0, 10);
}

function getWindowStart(): string {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WINDOW_DAYS);
  return since.toISOString();
}

/** repeated_resolution: operational_responsibilities satisfied, satisfied_by_event_id not null, assigned_role != originator. */
async function getResolutionOccurrences(
  workspaceId: string,
  sinceIso: string
): Promise<{ thread_id: string; observed_at: string }[]> {
  const db = getDb();
  const { data: rows } = await db
    .from("operational_responsibilities")
    .select("thread_id, resolved_at")
    .eq("satisfied", true)
    .not("satisfied_by_event_id", "is", null)
    .neq("assigned_role", "originator")
    .not("resolved_at", "is", null)
    .gte("resolved_at", sinceIso);
  if (!rows?.length) return [];
  const threadIds = [...new Set((rows as { thread_id: string }[]).map((r) => r.thread_id))];
  const { data: txs } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", threadIds);
  const inWorkspace = new Set((txs ?? []).map((t: { id: string }) => t.id));
  return (rows as { thread_id: string; resolved_at: string }[])
    .filter((r) => inWorkspace.has(r.thread_id))
    .map((r) => ({ thread_id: r.thread_id, observed_at: r.resolved_at }));
}

/** repeated_confirmation: shared_transactions state = acknowledged, acknowledged_at not null. */
async function getConfirmationOccurrences(
  workspaceId: string,
  sinceIso: string
): Promise<{ thread_id: string; observed_at: string }[]> {
  const db = getDb();
  const { data: rows } = await db
    .from("shared_transactions")
    .select("id, acknowledged_at")
    .eq("workspace_id", workspaceId)
    .eq("state", "acknowledged")
    .not("acknowledged_at", "is", null)
    .gte("acknowledged_at", sinceIso);
  if (!rows?.length) return [];
  return (rows as { id: string; acknowledged_at: string }[]).map((r) => ({
    thread_id: r.id,
    observed_at: r.acknowledged_at,
  }));
}

/** repeated_settlement: outcome_dependency → payment_obligation, obligation state resolved; source thread in workspace. */
async function getSettlementOccurrences(
  workspaceId: string,
  sinceIso: string
): Promise<{ thread_id: string; observed_at: string }[]> {
  const db = getDb();
  const { data: deps } = await db
    .from("outcome_dependencies")
    .select("source_thread_id, dependent_context_id")
    .eq("dependent_context_type", "payment_obligation");
  if (!deps?.length) return [];
  const out: { thread_id: string; observed_at: string }[] = [];
  for (const d of deps as { source_thread_id: string; dependent_context_id: string }[]) {
    const { data: tx } = await db
      .from("shared_transactions")
      .select("workspace_id")
      .eq("id", d.source_thread_id)
      .maybeSingle();
    if (!tx || (tx as { workspace_id: string }).workspace_id !== workspaceId) continue;
    const { data: pay } = await db
      .from("payment_obligations")
      .select("updated_at")
      .eq("id", d.dependent_context_id)
      .eq("workspace_id", workspaceId)
      .eq("state", "resolved")
      .gte("updated_at", sinceIso)
      .maybeSingle();
    if (!pay) continue;
    out.push({
      thread_id: d.source_thread_id,
      observed_at: (pay as { updated_at: string }).updated_at,
    });
  }
  return out;
}

/** repeated_followthrough: thread_assignments resolved_by_event_id not null, assignment_type = perform_work, assigned_role = downstream. */
async function getFollowthroughOccurrences(
  workspaceId: string,
  sinceIso: string
): Promise<{ thread_id: string; observed_at: string }[]> {
  const db = getDb();
  const { data: rows } = await db
    .from("thread_assignments")
    .select("thread_id, resolved_at")
    .eq("assigned_role", "downstream")
    .eq("assignment_type", "perform_work")
    .not("resolved_by_event_id", "is", null)
    .not("resolved_at", "is", null)
    .gte("resolved_at", sinceIso);
  if (!rows?.length) return [];
  const threadIds = [...new Set((rows as { thread_id: string }[]).map((r) => r.thread_id))];
  const { data: txs } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", threadIds);
  const inWorkspace = new Set((txs ?? []).map((t: { id: string }) => t.id));
  return (rows as { thread_id: string; resolved_at: string }[])
    .filter((r) => inWorkspace.has(r.thread_id))
    .map((r) => ({ thread_id: r.thread_id, observed_at: r.resolved_at }));
}

async function getOccurrences(
  workspaceId: string,
  stabilityType: StabilityType,
  sinceIso: string
): Promise<{ thread_id: string; observed_at: string }[]> {
  switch (stabilityType) {
    case "repeated_resolution":
      return getResolutionOccurrences(workspaceId, sinceIso);
    case "repeated_confirmation":
      return getConfirmationOccurrences(workspaceId, sinceIso);
    case "repeated_settlement":
      return getSettlementOccurrences(workspaceId, sinceIso);
    case "repeated_followthrough":
      return getFollowthroughOccurrences(workspaceId, sinceIso);
  }
}

/**
 * Run all temporal stability detectors for a workspace. Last 7 days, UTC dates.
 * Writes record only when threads >= MIN_THREADS and distinct UTC days >= MIN_DAYS.
 */
export async function runTemporalStabilityDetectors(workspaceId: string): Promise<void> {
  const sinceIso = getWindowStart();
  const types: StabilityType[] = [
    "repeated_resolution",
    "repeated_confirmation",
    "repeated_settlement",
    "repeated_followthrough",
  ];

  for (const stabilityType of types) {
    const occurrences = await getOccurrences(workspaceId, stabilityType, sinceIso);
    const threadIds = new Set<string>();
    const days = new Set<string>();
    let firstAt: string | null = null;
    let lastAt: string | null = null;
    for (const o of occurrences) {
      threadIds.add(o.thread_id);
      days.add(utcDate(o.observed_at));
      if (!firstAt || o.observed_at < firstAt) firstAt = o.observed_at;
      if (!lastAt || o.observed_at > lastAt) lastAt = o.observed_at;
    }
    if (
      threadIds.size < MIN_THREADS ||
      days.size < MIN_DAYS ||
      !firstAt ||
      !lastAt
    )
      continue;
    await upsertStabilityRecord(workspaceId, stabilityType, {
      first_observed_at: firstAt,
      last_confirmed_at: lastAt,
      occurrence_count: occurrences.length,
      independent_threads_count: threadIds.size,
    });
  }
}
