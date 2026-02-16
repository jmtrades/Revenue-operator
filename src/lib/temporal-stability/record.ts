/**
 * Temporal stability records: append-only upsert. No deletes.
 * Detector computes first_observed_at, last_confirmed_at, occurrence_count, independent_threads_count; we write them.
 */

import { getDb } from "@/lib/db/queries";
import type { StabilityType } from "./doctrine";

export type { StabilityType };

export interface StabilityRecordPayload {
  first_observed_at: string;
  last_confirmed_at: string;
  occurrence_count: number;
  independent_threads_count: number;
}

/**
 * Upsert one stability record. On conflict: extend window (LEAST first, GREATEST last), take MAX of counts.
 * No deletes. Deterministic.
 */
export async function upsertStabilityRecord(
  workspaceId: string,
  stabilityType: StabilityType,
  payload: StabilityRecordPayload
): Promise<void> {
  const db = getDb();
  const { data: existing } = await db
    .from("temporal_stability_records")
    .select("id, first_observed_at, last_confirmed_at, occurrence_count, independent_threads_count")
    .eq("workspace_id", workspaceId)
    .eq("stability_type", stabilityType)
    .maybeSingle();

  if (existing) {
    const e = existing as {
      id: string;
      first_observed_at: string;
      last_confirmed_at: string;
      occurrence_count: number;
      independent_threads_count: number;
    };
    const first = e.first_observed_at < payload.first_observed_at ? e.first_observed_at : payload.first_observed_at;
    const last = e.last_confirmed_at > payload.last_confirmed_at ? e.last_confirmed_at : payload.last_confirmed_at;
    const occ = Math.max(e.occurrence_count, payload.occurrence_count);
    const threads = Math.max(e.independent_threads_count, payload.independent_threads_count);
    await db
      .from("temporal_stability_records")
      .update({
        first_observed_at: first,
        last_confirmed_at: last,
        occurrence_count: occ,
        independent_threads_count: threads,
      })
      .eq("id", e.id);
  } else {
    await db.from("temporal_stability_records").insert({
      workspace_id: workspaceId,
      stability_type: stabilityType,
      first_observed_at: payload.first_observed_at,
      last_confirmed_at: payload.last_confirmed_at,
      occurrence_count: payload.occurrence_count,
      independent_threads_count: payload.independent_threads_count,
    });
  }
}
