/**
 * Active operational expectations: situations the process is maintaining.
 * Present-state only. No prediction.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import type { ExpectationType } from "./types";

export async function upsertOperationalExpectation(
  workspaceId: string,
  expectationType: ExpectationType,
  referenceId: string,
  maintainedBySystem: boolean
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("active_operational_expectations")
    .select("id, first_observed_at")
    .eq("workspace_id", workspaceId)
    .eq("expectation_type", expectationType)
    .eq("reference_id", referenceId)
    .maybeSingle();

  if (existing) {
    await db
      .from("active_operational_expectations")
      .update({
        maintained_by_system: maintainedBySystem,
        last_observed_at: now,
      })
      .eq("workspace_id", workspaceId)
      .eq("expectation_type", expectationType)
      .eq("reference_id", referenceId);
  } else {
    await db.from("active_operational_expectations").insert({
      workspace_id: workspaceId,
      expectation_type: expectationType,
      reference_id: referenceId,
      maintained_by_system: maintainedBySystem,
      first_observed_at: now,
      last_observed_at: now,
    });
  }
  if (maintainedBySystem) {
    const { recordContinuityLoad } = await import("@/lib/continuity-load");
    recordContinuityLoad(workspaceId, "expectation_maintained", `${expectationType}:${referenceId}`).catch((e: unknown) => {
      log("error", "recordContinuityLoad failed", { error: e instanceof Error ? e.message : String(e) });
    });
  }
}

export async function removeOperationalExpectation(
  workspaceId: string,
  expectationType: ExpectationType,
  referenceId: string
): Promise<void> {
  const db = getDb();
  await db
    .from("active_operational_expectations")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("expectation_type", expectationType)
    .eq("reference_id", referenceId);
}

const MIN_EXPECTATIONS = 3;
const MIN_DISTINCT_TYPES = 2;
const MIN_MAINTAINED_BY_SYSTEM = 2;
const MIN_AGE_HOURS = 2;
const FRESH_WINDOW_HOURS = 24;

/**
 * True only when anchor anti-false-positive conditions are met:
 * - At least 3 expectations with last_observed_at within 24h
 * - At least 2 distinct expectation_type among those
 * - At least 1 expectation has first_observed_at >= 2 hours ago
 * - At least 2 of those have maintained_by_system = true
 */
export async function processMaintainsOperation(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const now = new Date();
  const freshCutoff = new Date(now.getTime() - FRESH_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const minAgeCutoff = new Date(now.getTime() - MIN_AGE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: rows } = await db
    .from("active_operational_expectations")
    .select("first_observed_at, expectation_type, maintained_by_system")
    .eq("workspace_id", workspaceId)
    .gte("last_observed_at", freshCutoff);

  const list = rows ?? [];
  if (list.length < MIN_EXPECTATIONS) return false;

  const types = new Set(list.map((r: { expectation_type: string }) => r.expectation_type));
  if (types.size < MIN_DISTINCT_TYPES) return false;

  const atLeastOneOld = list.some(
    (r: { first_observed_at: string }) => r.first_observed_at <= minAgeCutoff
  );
  if (!atLeastOneOld) return false;

  const maintainedCount = list.filter(
    (r: { maintained_by_system: boolean }) => r.maintained_by_system === true
  ).length;
  return maintainedCount >= MIN_MAINTAINED_BY_SYSTEM;
}
