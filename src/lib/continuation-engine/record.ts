/**
 * Record continuation exposure when intervention stops it. Deterministic: state A persisted, system acted, state B.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import type { UnresolvedState } from "./types";

/**
 * Record that a continuation was stopped. Insert with intervention_stopped_it = true.
 */
export async function recordContinuationStopped(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  unresolvedState: UnresolvedState | string,
  durationSeconds: number = 0
): Promise<void> {
  const db = getDb();
  await db.from("continuation_exposures").insert({
    workspace_id: workspaceId,
    subject_type: subjectType,
    subject_id: subjectId,
    unresolved_state: unresolvedState,
    duration_seconds: durationSeconds,
    intervention_stopped_it: true,
    recorded_at: new Date().toISOString(),
  });
  const { recordContinuityLoad } = await import("@/lib/continuity-load");
  recordContinuityLoad(workspaceId, "continuation_prevented", `${subjectType}:${subjectId}`).catch((e) => {
    log("error", "recordContinuityLoad failed", { error: e instanceof Error ? e.message : String(e) });
  });
  const { resolveExposureFromContinuation } = await import("@/lib/exposure-engine");
  resolveExposureFromContinuation(workspaceId, subjectType, subjectId, unresolvedState).catch((e) => {
    log("error", "resolveExposureFromContinuation failed", { error: e instanceof Error ? e.message : String(e) });
  });
}

export async function countStoppedInLastDays(workspaceId: string, days: number): Promise<number> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { count } = await db
    .from("continuation_exposures")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("intervention_stopped_it", true)
    .gte("recorded_at", since.toISOString());
  return count ?? 0;
}

const CONTINUATION_LINE: Record<string, string> = {
  waiting: "A response delay would have continued.",
  uncertain_attendance: "Attendance uncertainty would have remained.",
  unpaid: "Payment would have remained incomplete.",
  unaligned: "Responsibility would have remained unclear.",
};

const MAX_LINE_LEN = 90;

function trim(s: string): string {
  return s.length > MAX_LINE_LEN ? s.slice(0, MAX_LINE_LEN).trim() : s;
}

/**
 * Factual lines for exposures stopped in last N days. No numbers, no counts.
 */
export async function getContinuationLinesStoppedInLastDays(
  workspaceId: string,
  days: number
): Promise<string[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data: rows } = await db
    .from("continuation_exposures")
    .select("unresolved_state")
    .eq("workspace_id", workspaceId)
    .eq("intervention_stopped_it", true)
    .gte("recorded_at", since.toISOString());

  const states = new Set((rows ?? []).map((r: { unresolved_state: string }) => r.unresolved_state));
  const lines: string[] = [];
  for (const state of ["waiting", "uncertain_attendance", "unpaid", "unaligned"]) {
    if (states.has(state)) {
      const line = CONTINUATION_LINE[state];
      if (line) lines.push(trim(line));
    }
  }
  return lines;
}
