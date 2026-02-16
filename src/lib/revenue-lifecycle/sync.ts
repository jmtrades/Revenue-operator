/**
 * Sync lead state and events to RevenueLifecycle.
 * Called on first contact, booking_created, call_completed, no_show.
 */

import type { LeadState } from "@/lib/types";
import type { LifecycleStage, RevenueLifecycleState } from "./types";
import { upsertRevenueLifecycle } from "./store";

function leadStateToLifecycleStage(state: LeadState): LifecycleStage {
  const map: Record<LeadState, LifecycleStage> = {
    NEW: "new_lead",
    CONTACTED: "active_prospect",
    ENGAGED: "active_prospect",
    QUALIFIED: "active_prospect",
    BOOKED: "scheduled",
    SHOWED: "showed",
    WON: "client",
    LOST: "lost",
    RETAIN: "repeat_client",
    REACTIVATE: "reactivated",
    CLOSED: "repeat_client",
  };
  return map[state] ?? "new_lead";
}

function leadStateToRevenueState(state: LeadState): RevenueLifecycleState {
  const map: Record<LeadState, RevenueLifecycleState> = {
    NEW: "potential",
    CONTACTED: "potential",
    ENGAGED: "potential",
    QUALIFIED: "potential",
    BOOKED: "scheduled",
    SHOWED: "secured",
    WON: "realized",
    LOST: "lost",
    RETAIN: "repeat",
    REACTIVATE: "recovered",
    CLOSED: "repeat",
  };
  return map[state] ?? "potential";
}

/** Call when lead is first created or first message received */
export async function syncFirstContact(leadId: string, workspaceId: string): Promise<void> {
  const now = new Date().toISOString();
  await upsertRevenueLifecycle(leadId, workspaceId, {
    first_contact_at: now,
    lifecycle_stage: "new_lead",
    revenue_state: "potential",
    dropoff_risk: 0,
  });
}

/** Call when booking is created */
export async function syncBooked(
  leadId: string,
  workspaceId: string,
  nextExpectedAt: string | null
): Promise<void> {
  const now = new Date().toISOString();
  await upsertRevenueLifecycle(leadId, workspaceId, {
    booked_at: now,
    next_expected_visit_at: nextExpectedAt,
    lifecycle_stage: "scheduled",
    revenue_state: "scheduled",
    dropoff_risk: 0.3,
  });
}

/** Call when lead showed up */
export async function syncShowed(leadId: string, workspaceId: string): Promise<void> {
  const now = new Date().toISOString();
  await upsertRevenueLifecycle(leadId, workspaceId, {
    showed_at: now,
    last_visit_at: now,
    lifecycle_stage: "showed",
    revenue_state: "secured",
    lifetime_value_stage: "first_visit",
    dropoff_risk: 0,
  });
}

/** Call on no-show */
export async function syncNoShow(leadId: string, workspaceId: string): Promise<void> {
  await upsertRevenueLifecycle(leadId, workspaceId, {
    lifecycle_stage: "at_risk",
    revenue_state: "at_risk",
    dropoff_risk: 0.8,
  });
}

/** Sync from current lead state (e.g. after event engine update) */
export async function syncFromLeadState(
  leadId: string,
  workspaceId: string,
  state: LeadState
): Promise<void> {
  await upsertRevenueLifecycle(leadId, workspaceId, {
    lifecycle_stage: leadStateToLifecycleStage(state),
    revenue_state: leadStateToRevenueState(state),
  });
}
