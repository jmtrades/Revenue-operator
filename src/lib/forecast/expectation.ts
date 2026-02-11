/**
 * Weekly expectation anchor: expected conversations per week based on pipeline behaviour.
 * Only computed when workspace has 48h runtime OR 30+ interactions.
 * Stored in workspace_health, updated daily.
 */

import { getDb } from "@/lib/db/queries";

export interface WeeklyExpectation {
  low: number;
  high: number;
  confidence: number; // 0–1
}

const MIN_RUNTIME_MS = 48 * 60 * 60 * 1000;
const MIN_INTERACTIONS = 30;

/** Check if workspace is eligible for expectation computation */
async function isEligible(workspaceId: string): Promise<boolean> {
  const db = getDb();

  const { data: ws } = await db.from("workspaces").select("created_at").eq("id", workspaceId).single();
  if (!ws) return false;

  const created = new Date((ws as { created_at: string }).created_at).getTime();
  const runtimeMs = Date.now() - created;
  if (runtimeMs >= MIN_RUNTIME_MS) return true;

  const { count: actionCount } = await db
    .from("action_logs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const { count: eventCount } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const interactions = (actionCount ?? 0) + (eventCount ?? 0);
  return interactions >= MIN_INTERACTIONS;
}

/** Compute expected weekly conversations. Returns null if not eligible. */
export async function computeWeeklyExpectation(workspaceId: string): Promise<WeeklyExpectation | null> {
  if (!(await isEligible(workspaceId))) return null;

  const db = getDb();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { count: bookingsLast14d } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", fourteenDaysAgo.toISOString());

  const { count: completionsLast14d } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "call_completed")
    .gte("created_at", fourteenDaysAgo.toISOString());

  const { count: pipelineDeals } = await db
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"]);

  const { count: pipelineLeads } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("state", ["CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED"]);

  const bookings = bookingsLast14d ?? 0;
  const completions = completionsLast14d ?? 0;
  const deals = pipelineDeals ?? 0;
  const leads = pipelineLeads ?? 0;

  const velocityPerWeek = bookings / 2;
  const showRate = bookings > 0 ? completions / bookings : 0.7;
  const pipelineVolume = Math.max(deals, Math.floor(leads * 0.5));

  let base = velocityPerWeek;
  if (base < 1 && pipelineVolume > 0) {
    base = Math.max(0.5, pipelineVolume * 0.1 * (showRate || 0.7));
  }
  base = Math.max(0.5, base);

  const low = Math.max(0, Math.floor(base * 0.7));
  const high = Math.ceil(base * 1.4);
  const sampleStrength = Math.min(1, (bookings + pipelineVolume) / 20);
  const confidence = Math.round((0.3 + 0.7 * sampleStrength) * 100) / 100;

  return { low, high, confidence };
}

/** Compute and persist expectation. Only updates if eligible and stale (>24h). */
export async function ensureWeeklyExpectation(workspaceId: string): Promise<WeeklyExpectation | null> {
  const db = getDb();
  const expectation = await computeWeeklyExpectation(workspaceId);
  if (!expectation) return null;

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data: existing } = await db
    .from("workspace_health")
    .select("expected_weekly_low, expected_weekly_high, expected_confidence, expected_computed_at")
    .eq("workspace_id", workspaceId)
    .single();

  const computedAt = (existing as { expected_computed_at?: string } | null)?.expected_computed_at;
  if (computedAt && new Date(computedAt) > oneDayAgo) {
    const ex = existing as { expected_weekly_low?: number; expected_weekly_high?: number; expected_confidence?: number } | null;
    return {
      low: ex?.expected_weekly_low ?? expectation.low,
      high: ex?.expected_weekly_high ?? expectation.high,
      confidence: Number(ex?.expected_confidence ?? expectation.confidence),
    };
  }

  await db
    .from("workspace_health")
    .upsert(
      {
        workspace_id: workspaceId,
        expected_weekly_low: expectation.low,
        expected_weekly_high: expectation.high,
        expected_confidence: expectation.confidence,
        expected_computed_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

  return expectation;
}

export interface ProjectionImpact {
  expected_with_protection: { low: number; high: number };
  expected_without_protection: { low: number; high: number };
  continuity_factor: number;
}

/**
 * Compute projection impact when continuity is interrupted (paused).
 * degraded = expected * continuity_factor.
 */
export function computeProjectionImpact(
  expected: WeeklyExpectation,
  context: {
    conversations_cooling: number;
    followups_scheduled: number;
    reply_windows_active: number;
  }
): ProjectionImpact {
  let factor = 1;
  factor -= Math.min(0.35, context.conversations_cooling * 0.07);
  factor -= context.followups_scheduled > 0 ? 0.25 : 0;
  factor -= context.reply_windows_active > 0 ? 0.15 : 0;
  const continuity_factor = Math.max(0.2, factor);

  return {
    expected_with_protection: { low: expected.low, high: expected.high },
    expected_without_protection: {
      low: Math.max(0, Math.floor(expected.low * continuity_factor)),
      high: Math.max(0, Math.ceil(expected.high * continuity_factor)),
    },
    continuity_factor,
  };
}
