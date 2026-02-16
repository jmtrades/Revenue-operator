/**
 * Trajectory intelligence — optimise future operational stability.
 * Pipeline balance, return cycle, demand temperature. Internal only. No UI. No campaigns.
 * Only behavioural changes in when decisions happen, not what is said.
 */

import { getDb } from "@/lib/db/queries";
import { getCapacityInputs, getCapacityPressure } from "./capacity-stability";
import { getSchedulingRules } from "@/lib/calendar-optimization";

const VALUE_HIGH_CENTS = 50000;
const VALUE_LOW_CENTS = 20000;
const PIPELINE_MIN = 5;
const HIGH_VALUE_RATIO_FLOOR = 0.2;
const LOW_VALUE_RATIO_CEIL = 0.7;
const OVERLOAD_RATIO = 0.8;
const MS_DAY = 24 * 60 * 60 * 1000;
const DAYS_30 = 30;

export type DemandTemperature = "overheated" | "normal" | "underheated";

export interface TrajectoryStateRow {
  high_value_underrepresented: boolean;
  low_value_overload: boolean;
  future_overload: boolean;
  future_empty: boolean;
  return_cycle_underperforming: boolean;
  demand_temperature: DemandTemperature;
  updated_at: string;
}

async function computePipelineBalance(workspaceId: string): Promise<{
  high_value_underrepresented: boolean;
  low_value_overload: boolean;
  future_overload: boolean;
  future_empty: boolean;
}> {
  const db = getDb();
  const rules = await getSchedulingRules(workspaceId);
  const maxCalls = rules.max_calls_per_day ?? 20;
  const blockedDays = rules.blocked_days ?? [];

  const { data: deals } = await db
    .from("deals")
    .select("value_cents")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"]);

  let high = 0;
  let low = 0;
  for (const d of deals ?? []) {
    const c = (d as { value_cents?: number }).value_cents ?? 0;
    if (c >= VALUE_HIGH_CENTS) high++;
    else if (c < VALUE_LOW_CENTS) low++;
  }
  const total = (deals ?? []).length;
  const high_value_underrepresented =
    total >= PIPELINE_MIN && total > 0 && high / total < HIGH_VALUE_RATIO_FLOOR;
  const low_value_overload = total >= PIPELINE_MIN && total > 0 && low / total > LOW_VALUE_RATIO_CEIL;

  const now = new Date();
  let future_overload = false;
  let future_empty = false;
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
    if (maxThisDay > 0 && booked >= OVERLOAD_RATIO * maxThisDay) future_overload = true;
    if (maxThisDay > 0 && booked === 0) future_empty = true;
  }

  return {
    high_value_underrepresented,
    low_value_overload,
    future_overload,
    future_empty,
  };
}

async function computeReturnCycleUnderperforming(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const now = new Date();
  const currentStart = new Date(now.getTime() - DAYS_30 * MS_DAY);
  const previousStart = new Date(now.getTime() - 2 * DAYS_30 * MS_DAY);

  try {
    const { count: currentRepeat } = await db
      .from("revenue_lifecycles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("lifecycle_stage", ["repeat_client", "client"])
      .gte("updated_at", currentStart.toISOString());

    const { count: previousRepeat } = await db
      .from("revenue_lifecycles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("lifecycle_stage", ["repeat_client", "client"])
      .gte("updated_at", previousStart.toISOString())
      .lt("updated_at", currentStart.toISOString());

    const curr = currentRepeat ?? 0;
    const prev = previousRepeat ?? 0;
    if (prev > 0 && curr < 0.7 * prev) return true;
  } catch {
    // revenue_lifecycles may not exist
  }

  const { count: currentWon } = await db
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "won")
    .gte("closed_at", currentStart.toISOString());

  const { count: previousWon } = await db
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "won")
    .gte("closed_at", previousStart.toISOString());

  const c = currentWon ?? 0;
  const p = previousWon ?? 0;
  return p > 2 && c < 0.7 * p;
}

function computeDemandTemperature(
  capacityLevel: number,
  capacityInputs: { open_slots_next_7_days: number; waitlist_count: number; booking_velocity_last_72h: number }
): DemandTemperature {
  if (capacityLevel >= 3) return "overheated";
  if (capacityLevel >= 2 && capacityInputs.waitlist_count > 2 * Math.max(1, capacityInputs.open_slots_next_7_days))
    return "overheated";
  if (capacityLevel === 0 && capacityInputs.booking_velocity_last_72h < 2 && capacityInputs.waitlist_count < 5)
    return "underheated";
  return "normal";
}

/**
 * Get current trajectory state for workspace. Returns null if never computed.
 */
export async function getTrajectoryState(workspaceId: string): Promise<TrajectoryStateRow | null> {
  const db = getDb();
  const { data } = await db
    .from("guarantee_trajectory_state")
    .select(
      "high_value_underrepresented, low_value_overload, future_overload, future_empty, return_cycle_underperforming, demand_temperature, updated_at"
    )
    .eq("workspace_id", workspaceId)
    .single();
  return data as TrajectoryStateRow | null;
}

/**
 * Compute and persist trajectory state. Call from cron.
 */
export async function updateTrajectoryState(workspaceId: string): Promise<TrajectoryStateRow> {
  const pipeline = await computePipelineBalance(workspaceId);
  const return_cycle_underperforming = await computeReturnCycleUnderperforming(workspaceId);
  const capacityInputs = await getCapacityInputs(workspaceId);
  const capacityRow = await getCapacityPressure(workspaceId);
  const capacityLevel = capacityRow?.pressure_level ?? 0;
  const demand_temperature = computeDemandTemperature(capacityLevel, capacityInputs);

  const now = new Date().toISOString();
  const row: TrajectoryStateRow = {
    ...pipeline,
    return_cycle_underperforming,
    demand_temperature,
    updated_at: now,
  };

  const db = getDb();
  await db
    .from("guarantee_trajectory_state")
    .upsert(
      {
        workspace_id: workspaceId,
        high_value_underrepresented: row.high_value_underrepresented,
        low_value_overload: row.low_value_overload,
        future_overload: row.future_overload,
        future_empty: row.future_empty,
        return_cycle_underperforming: row.return_cycle_underperforming,
        demand_temperature: row.demand_temperature,
        updated_at: row.updated_at,
      },
      { onConflict: "workspace_id" }
    );

  return row;
}

export function isDemandOverheated(t: TrajectoryStateRow | null | undefined): boolean {
  return (t?.demand_temperature ?? "normal") === "overheated";
}

export function isDemandUnderheated(t: TrajectoryStateRow | null | undefined): boolean {
  return (t?.demand_temperature ?? "normal") === "underheated";
}
