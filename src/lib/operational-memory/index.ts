/**
 * Operational memory: durable facts that influence engine behavior.
 * Removing the system causes the business to "forget reality".
 */

import { getDb } from "@/lib/db/queries";

export type PatternType = "repeatedly_reschedules" | "repeatedly_confirms" | "repeatedly_misses" | "consistent_confirm";

/** Record or increment commitment behavior pattern (e.g. reschedule). */
export async function recordCommitmentBehavior(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  patternType: PatternType
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("commitment_behavior_patterns")
    .select("id, occurrence_count")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .eq("pattern_type", patternType)
    .maybeSingle();
  if (existing) {
    const row = existing as { id: string; occurrence_count: number };
    await db
      .from("commitment_behavior_patterns")
      .update({
        occurrence_count: row.occurrence_count + 1,
        last_seen_at: now,
      })
      .eq("id", row.id);
  } else {
    await db.from("commitment_behavior_patterns").insert({
      workspace_id: workspaceId,
      subject_type: subjectType,
      subject_id: subjectId,
      pattern_type: patternType,
      occurrence_count: 1,
      last_seen_at: now,
    });
  }
}

/** Get dominant pattern for subject (e.g. repeatedly_reschedules if count >= 2). */
export async function getCommitmentBehaviorPattern(
  workspaceId: string,
  subjectType: string,
  subjectId: string
): Promise<PatternType | null> {
  const db = getDb();
  const { data: rows } = await db
    .from("commitment_behavior_patterns")
    .select("pattern_type, occurrence_count")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId);
  const list = (rows ?? []) as { pattern_type: string; occurrence_count: number }[];
  if (!list.length) return null;
  const dominant = list.reduce((a, b) => (a.occurrence_count >= b.occurrence_count ? a : b));
  return dominant.occurrence_count >= 2 ? (dominant.pattern_type as PatternType) : null;
}

/** Record outcome precedent for future behavior. */
export async function recordOutcomePrecedent(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  outcomeType: string
): Promise<void> {
  const db = getDb();
  await db.from("outcome_precedents").insert({
    workspace_id: workspaceId,
    subject_type: subjectType,
    subject_id: subjectId,
    outcome_type: outcomeType,
  });
}

/** Store outstanding promise. */
export async function recordPromise(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  promiseSummary: string
): Promise<void> {
  const db = getDb();
  await db.from("operational_promises").insert({
    workspace_id: workspaceId,
    subject_type: subjectType,
    subject_id: subjectId,
    promise_summary: promiseSummary,
  });
}

/** Mark promise fulfilled. */
export async function fulfillPromise(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  promiseSummary: string
): Promise<void> {
  const db = getDb();
  await db
    .from("operational_promises")
    .update({ fulfilled_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .eq("promise_summary", promiseSummary)
    .is("fulfilled_at", null);
}

/** Count unfulfilled promises for workspace. */
export async function hasOutstandingPromises(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("operational_promises")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("fulfilled_at", null)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Record recurring expectation for counterparty. */
export async function upsertRecurringExpectation(
  workspaceId: string,
  counterpartyIdentifier: string,
  expectationType: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.from("recurring_expectations").upsert(
    {
      workspace_id: workspaceId,
      counterparty_identifier: counterpartyIdentifier,
      expectation_type: expectationType,
      updated_at: now,
    },
    { onConflict: "workspace_id,counterparty_identifier,expectation_type" }
  );
}

/** Check if workspace has any operational memory entries (for dependency proof). */
export async function isOperationalMemoryActive(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const [p, r, o, c] = await Promise.all([
    db.from("operational_promises").select("id").eq("workspace_id", workspaceId).limit(1),
    db.from("recurring_expectations").select("id").eq("workspace_id", workspaceId).limit(1),
    db.from("outcome_precedents").select("id").eq("workspace_id", workspaceId).limit(1),
    db.from("commitment_behavior_patterns").select("id").eq("workspace_id", workspaceId).limit(1),
  ]);
  return !!(p.data?.length || r.data?.length || o.data?.length || c.data?.length);
}
