/**
 * Record and query operational exposures. Daily dedupe; resolution marking.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import type { ExposureType, SubjectType, InterruptionSource } from "./types";
import { EXPOSURE_LINES, sanitizeLine } from "./doctrine";

const logExposureSideEffect = (context: string) => (e: unknown) => {
  log("warn", `exposure_engine.record.${context}`, { error: e instanceof Error ? e.message : String(e) });
};

export async function upsertExposure(
  workspaceId: string,
  exposureType: ExposureType,
  subjectType: SubjectType,
  subjectId: string,
  relatedExternalRef?: string | null,
  now?: Date
): Promise<void> {
  const db = getDb();
  const t = (now ?? new Date()).toISOString();
  try {
    await db.from("operational_exposures").insert({
      workspace_id: workspaceId,
      exposure_type: exposureType,
      subject_type: subjectType,
      subject_id: String(subjectId),
      related_external_ref: relatedExternalRef ?? null,
      first_observed_at: t,
      last_observed_at: t,
      exposure_resolved_at: null,
      interrupted_by_process: false,
      interruption_source: null,
      recorded_at: t,
      observation_count: 1,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") {
      const dayStart = t.slice(0, 10) + "T00:00:00.000Z";
      const dayEnd = new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await db
        .from("operational_exposures")
        .select("observation_count")
        .eq("workspace_id", workspaceId)
        .eq("exposure_type", exposureType)
        .eq("subject_type", subjectType)
        .eq("subject_id", String(subjectId))
        .gte("first_observed_at", dayStart)
        .lt("first_observed_at", dayEnd)
        .maybeSingle();
      const nextCount = ((existing as { observation_count?: number } | null)?.observation_count ?? 1) + 1;
      await db
        .from("operational_exposures")
        .update({ last_observed_at: t, observation_count: nextCount })
        .eq("workspace_id", workspaceId)
        .eq("exposure_type", exposureType)
        .eq("subject_type", subjectType)
        .eq("subject_id", String(subjectId))
        .gte("first_observed_at", dayStart)
        .lt("first_observed_at", dayEnd);
      return;
    }
    throw err;
  }
}

const RESOLUTION_WINDOW_DAYS = 7;

export async function markExposureResolved(
  workspaceId: string,
  exposureType: ExposureType,
  subjectType: SubjectType,
  subjectId: string,
  interruptionSource: InterruptionSource,
  now?: Date
): Promise<void> {
  const db = getDb();
  const t = (now ?? new Date()).toISOString();
  const since = new Date(Date.now() - RESOLUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await db
    .from("operational_exposures")
    .select("id, related_external_ref")
    .eq("workspace_id", workspaceId)
    .eq("exposure_type", exposureType)
    .eq("subject_type", subjectType)
    .eq("subject_id", String(subjectId))
    .is("exposure_resolved_at", null)
    .gte("last_observed_at", since)
    .order("last_observed_at", { ascending: false })
    .limit(1);

  if (!rows?.length) return;

  const row = rows[0] as { id: string; related_external_ref?: string | null };
  await db
    .from("operational_exposures")
    .update({
      exposure_resolved_at: t,
      interrupted_by_process: true,
      interruption_source: interruptionSource,
      last_observed_at: t,
    })
    .eq("id", row.id);

  const { recordContinuityLoad } = await import("@/lib/continuity-load");
  recordContinuityLoad(
    workspaceId,
    "protection_interrupted",
    `${exposureType}:${subjectType}:${subjectId}`
  ).catch(logExposureSideEffect("record_continuity_load"));
  const { recordFirstInterruptionOrientationOnce } = await import("./orientation");
  await recordFirstInterruptionOrientationOnce(workspaceId, new Date(t)).catch(logExposureSideEffect("record_first_interruption"));

  const authorityWindowMs = 30 * 60 * 1000;
  const authoritySince = new Date(Date.now() - authorityWindowMs).toISOString();
  const { data: escRows } = await db
    .from("escalation_logs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .gte("created_at", authoritySince)
    .limit(1);
  if ((escRows?.length ?? 0) > 0) {
    const { createIncidentStatement } = await import("@/lib/incidents");
    await createIncidentStatement(workspaceId, "protection_required_authority", row.related_external_ref ?? undefined).catch(logExposureSideEffect("create_incident_statement"));
  }
}

const STABLE_SOURCES = ["causal_chain", "continuation_stopped"];

export async function getInterruptedExposureLinesLast24h(
  workspaceId: string,
  limit: number = 8
): Promise<string[]> {
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await db
    .from("operational_exposures")
    .select("exposure_type, exposure_resolved_at, observation_count, interruption_source")
    .eq("workspace_id", workspaceId)
    .eq("interrupted_by_process", true)
    .gte("exposure_resolved_at", since)
    .order("exposure_resolved_at", { ascending: false })
    .limit(200);

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of rows ?? []) {
    const row = r as { exposure_type: string; observation_count?: number; interruption_source?: string | null };
    const stable =
      (row.observation_count ?? 1) >= 2 ||
      (row.interruption_source != null && STABLE_SOURCES.includes(row.interruption_source));
    if (!stable) continue;
    const line = EXPOSURE_LINES[row.exposure_type];
    if (!line) continue;
    const sanitized = sanitizeLine(line);
    if (!sanitized || seen.has(sanitized)) continue;
    seen.add(sanitized);
    lines.push(sanitized);
    if (lines.length >= limit) break;
  }
  return lines;
}

/** True if at least one interrupted exposure in last 24h (stable filter applied). Used for operational_position.protection_active. */
export async function hasInterruptedExposureLast24h(workspaceId: string): Promise<boolean> {
  const lines = await getInterruptedExposureLinesLast24h(workspaceId, 1);
  return lines.length > 0;
}
