/**
 * Workspace capacity pressure — internal state only.
 * 0 open, 1 normal, 2 limited, 3 critical.
 * Used to adapt decision behaviour and enforce revenue protection. Not exposed in UI.
 */

import { getDb } from "@/lib/db/queries";
import { getSchedulingRules } from "@/lib/calendar-optimization";

export type CapacityPressureLevel = 0 | 1 | 2 | 3;
/** 0 open, 1 normal, 2 limited, 3 critical */

const MS_DAY = 24 * 60 * 60 * 1000;
const HOURS_72 = 72 * 60 * 60 * 1000;

export interface CapacityStateRow {
  pressure_level: number;
  updated_at: string;
}

export interface CapacityInputs {
  open_slots_next_7_days: number;
  days_until_next_free_slot: number;
  booking_velocity_last_72h: number;
  waitlist_count: number;
  max_calls_per_day: number;
}

/**
 * Compute deterministic capacity inputs for a workspace.
 */
export async function getCapacityInputs(workspaceId: string): Promise<CapacityInputs> {
  const db = getDb();
  const rules = await getSchedulingRules(workspaceId);
  const maxCalls = rules.max_calls_per_day ?? 20;
  const blockedDays = rules.blocked_days ?? [];

  const now = new Date();
  let openSlots7d = 0;
  let daysUntilFree = 7;

  for (let d = 0; d < 7; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayOfWeek = day.getDay();
    const maxThisDay = blockedDays.includes(dayOfWeek) ? 0 : maxCalls;

    const { count } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("started_at", day.toISOString())
      .lt("started_at", dayEnd.toISOString());

    const booked = count ?? 0;
    const available = Math.max(0, maxThisDay - booked);
    openSlots7d += available;
    if (available > 0 && d < daysUntilFree) daysUntilFree = d;
  }

  const seventyTwoHoursAgo = new Date(Date.now() - HOURS_72).toISOString();
  const { count: bookings72h } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", seventyTwoHoursAgo);

  const { count: waitlist } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("state", ["CONTACTED", "ENGAGED", "QUALIFIED"]);

  return {
    open_slots_next_7_days: openSlots7d,
    days_until_next_free_slot: daysUntilFree,
    booking_velocity_last_72h: bookings72h ?? 0,
    waitlist_count: waitlist ?? 0,
    max_calls_per_day: maxCalls,
  };
}

/**
 * Map inputs to pressure level. Deterministic. No ML.
 * Many open slots → open; filling steadily → normal; few remaining → limited; almost full → critical.
 */
export function computeCapacityPressure(inputs: CapacityInputs): CapacityPressureLevel {
  const maxPossible7d = 7 * inputs.max_calls_per_day;
  const ratio = maxPossible7d > 0 ? inputs.open_slots_next_7_days / maxPossible7d : 1;
  const { days_until_next_free_slot: daysUntilFree, waitlist_count, open_slots_next_7_days } = inputs;

  if (ratio > 0.5) return 0; // open
  if (ratio > 0.25 && daysUntilFree < 3) return 1; // normal
  if (ratio <= 0.1 || daysUntilFree >= 5) return 3; // critical
  if (ratio <= 0.25 || daysUntilFree >= 3) return 2; // limited
  // Demand >> supply: waitlist much larger than open slots
  if (open_slots_next_7_days > 0 && waitlist_count > 3 * open_slots_next_7_days) {
    if (ratio <= 0.2) return 3;
    return 2;
  }
  return 1;
}

/**
 * Get current capacity pressure for workspace. Returns null if never computed.
 */
export async function getCapacityPressure(workspaceId: string): Promise<CapacityStateRow | null> {
  const db = getDb();
  const { data } = await db
    .from("guarantee_capacity_state")
    .select("pressure_level, updated_at")
    .eq("workspace_id", workspaceId)
    .single();
  return data as CapacityStateRow | null;
}

/**
 * Compute and persist capacity pressure. Call from cron or before decision batch.
 */
export async function updateCapacityPressure(workspaceId: string): Promise<CapacityPressureLevel> {
  const inputs = await getCapacityInputs(workspaceId);
  const level = computeCapacityPressure(inputs);
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("guarantee_capacity_state")
    .upsert(
      { workspace_id: workspaceId, pressure_level: level, updated_at: now },
      { onConflict: "workspace_id" }
    );
  return level;
}

/**
 * Whether capacity is at least limited (2) or critical (3). Used for revenue protection.
 */
export function isCapacityLimitedOrWorse(level: CapacityPressureLevel | null | undefined): boolean {
  return (level ?? 0) >= 2;
}

/**
 * Whether capacity is critical. Used to delay reactivation and reduce followups for indecisive leads.
 */
export function isCapacityCritical(level: CapacityPressureLevel | null | undefined): boolean {
  return (level ?? 0) >= 3;
}
