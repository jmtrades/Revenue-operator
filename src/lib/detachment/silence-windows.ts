/**
 * Operational silence: detect windows with no provider interaction while outcomes resolved.
 * Cron-safe. No numbers exposed.
 */

import { getDb } from "@/lib/db/queries";

const SILENCE_HOURS = 4;
const SCAN_HOURS = 24;

/** Detect silence windows in last 24h: no provider interaction ≥4h and at least one resolution in that gap. */
export async function detectOperationalSilence(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  const scanStart = new Date(now.getTime() - SCAN_HOURS * 60 * 60 * 1000);
  const silenceMs = SILENCE_HOURS * 60 * 60 * 1000;

  const { data: participations } = await db
    .from("provider_participation")
    .select("first_event_at")
    .eq("workspace_id", workspaceId)
    .gte("first_event_at", scanStart.toISOString())
    .order("first_event_at", { ascending: true });

  const { data: chains } = await db
    .from("causal_chains")
    .select("determined_at")
    .eq("workspace_id", workspaceId)
    .eq("dependency_established", true)
    .gte("determined_at", scanStart.toISOString())
    .lte("determined_at", now.toISOString());

  const { data: exposures } = await db
    .from("continuation_exposures")
    .select("recorded_at")
    .eq("workspace_id", workspaceId)
    .eq("intervention_stopped_it", true)
    .gte("recorded_at", scanStart.toISOString())
    .lte("recorded_at", now.toISOString());

  const resolutionTimes = new Set<number>([
    ...(chains ?? []).map((r: { determined_at: string }) => new Date(r.determined_at).getTime()),
    ...(exposures ?? []).map((r: { recorded_at: string }) => new Date(r.recorded_at).getTime()),
  ]);
  const interactionTimes = (participations ?? []).map((r: { first_event_at: string }) =>
    new Date(r.first_event_at).getTime()
  );

  const scanStartMs = scanStart.getTime();
  const nowMs = now.getTime();
  let windowStart = scanStartMs;
  for (const t of interactionTimes) {
    const gapStart = windowStart;
    const gapEnd = Math.min(t, nowMs);
    if (gapEnd - gapStart >= silenceMs) {
      const hasResolutionInGap = [...resolutionTimes].some(
        (r) => r >= gapStart && r <= gapEnd
      );
      if (hasResolutionInGap) {
        const { data: existing } = await db
          .from("operational_silence_windows")
          .select("id")
          .eq("workspace_id", workspaceId)
          .gte("started_at", new Date(gapStart).toISOString())
          .lte("ended_at", new Date(gapEnd).toISOString())
          .maybeSingle();
        if (!existing) {
          await db.from("operational_silence_windows").insert({
            workspace_id: workspaceId,
            started_at: new Date(gapStart).toISOString(),
            ended_at: new Date(gapEnd).toISOString(),
            outcomes_resolved: true,
          });
        }
      }
    }
    windowStart = Math.max(windowStart, t);
  }
  const finalGapStart = windowStart;
  const finalGapEnd = nowMs;
  if (finalGapEnd - finalGapStart >= silenceMs) {
    const hasResolutionInGap = [...resolutionTimes].some(
      (r) => r >= finalGapStart && r <= finalGapEnd
    );
    if (hasResolutionInGap) {
      const { data: existing } = await db
        .from("operational_silence_windows")
        .select("id")
        .eq("workspace_id", workspaceId)
        .gte("started_at", new Date(finalGapStart).toISOString())
        .lte("ended_at", new Date(finalGapEnd).toISOString())
        .maybeSingle();
      if (!existing) {
        await db.from("operational_silence_windows").insert({
          workspace_id: workspaceId,
          started_at: new Date(finalGapStart).toISOString(),
          ended_at: new Date(finalGapEnd).toISOString(),
          outcomes_resolved: true,
        });
      }
    }
  }
}
