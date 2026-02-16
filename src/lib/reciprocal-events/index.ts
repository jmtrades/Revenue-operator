/**
 * Reciprocal events: operational thread per shared transaction.
 * Records who acted, what action, outcome reference. No internal ids exposed to surfaces.
 * Preserves causality → continuation → displacement; adds cross-party coordination evidence.
 */

import { getDb } from "@/lib/db/queries";

export type ActorRole = "originator" | "counterparty" | "downstream" | "observer";

export type OperationalAction =
  | "created"
  | "acknowledged"
  | "disputed"
  | "rescheduled"
  | "provide_information"
  | "request_adjustment"
  | "schedule_follow_up"
  | "approve_next_step"
  | "assign_third_party"
  | "transfer_responsibility"
  | "acknowledge_responsibility"
  | "attach_outcome_evidence"
  | "reference_attached"
  | "record_viewed_by_new_party";

export interface RecordReciprocalEventInput {
  threadId: string;
  actorRole: ActorRole;
  operationalAction: OperationalAction;
  outcomeReference?: string | null;
  authorityTransfer?: boolean;
  dependencyCreated?: string | null;
}

/**
 * Append one event to the thread. Returns new event id for responsibility resolution. Call from shared-transaction assurance and public respond.
 */
export async function recordReciprocalEvent(input: RecordReciprocalEventInput): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("reciprocal_events")
    .insert({
      thread_id: input.threadId,
      actor_role: input.actorRole,
      operational_action: input.operationalAction,
      outcome_reference: input.outcomeReference ?? null,
      authority_transfer: input.authorityTransfer ?? false,
      dependency_created: input.dependencyCreated ?? null,
      recorded_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Get one event by id. Returns dependency_created and operational_action for outcome-dependency recording.
 */
export async function getReciprocalEventById(
  eventId: string
): Promise<{ dependency_created: string | null; operational_action: string } | null> {
  const db = getDb();
  const { data } = await db
    .from("reciprocal_events")
    .select("dependency_created, operational_action")
    .eq("id", eventId)
    .maybeSingle();
  return data as { dependency_created: string | null; operational_action: string } | null;
}

/**
 * Get chronological events for a thread. Internal use only; surfaces get doctrine-safe lines.
 */
export async function getReciprocalEventsForThread(
  threadId: string
): Promise<
  { actor_role: string; operational_action: string; recorded_at: string; authority_transfer: boolean }[]
> {
  const db = getDb();
  const { data } = await db
    .from("reciprocal_events")
    .select("actor_role, operational_action, recorded_at, authority_transfer")
    .eq("thread_id", threadId)
    .order("recorded_at", { ascending: true });
  return (data ?? []) as {
    actor_role: string;
    operational_action: string;
    recorded_at: string;
    authority_transfer: boolean;
  }[];
}

const MAX_LINE = 90;

/** Deterministic factual line per event. No internal ids. ≤90 chars. */
function eventToLine(
  actorRole: string,
  operationalAction: string,
  recordedAt: string
): string {
  const date = new Date(recordedAt);
  const d = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const who =
    actorRole === "originator"
      ? "Originator"
      : actorRole === "counterparty"
        ? "Counterparty"
        : actorRole === "downstream"
          ? "Downstream"
          : "Observer";
  const action = operationalAction.replace(/_/g, " ");
  const line = `${d}. ${who} ${action}.`;
  return line.length > MAX_LINE ? line.slice(0, MAX_LINE).trim() : line;
}

/**
 * Doctrine-safe continuation lines for a thread (for record surface). Factual only.
 */
export async function getContinuationLinesForThread(threadId: string): Promise<string[]> {
  const events = await getReciprocalEventsForThread(threadId);
  return events.map((e) => eventToLine(e.actor_role, e.operational_action, e.recorded_at));
}

/** Entries with recorded_at for merging with amendment entries (chronological record log). */
export async function getContinuationEntriesForThread(
  threadId: string
): Promise<{ recorded_at: string; line: string }[]> {
  const events = await getReciprocalEventsForThread(threadId);
  return events.map((e) => ({
    recorded_at: e.recorded_at,
    line: eventToLine(e.actor_role, e.operational_action, e.recorded_at),
  }));
}

/**
 * Resolve thread_id (shared_transaction id) by external_ref. Internal only.
 */
export async function getThreadIdByExternalRef(externalRef: string): Promise<string | null> {
  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("id")
    .eq("external_ref", externalRef)
    .maybeSingle();
  return (row as { id: string } | null)?.id ?? null;
}
