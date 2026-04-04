/**
 * Closure Layer — Invariant checks. No direct state mutation; returns required actions.
 */

import { getDb } from "@/lib/db/queries";
import type { ResponsibilityState } from "./responsibility";

export const AWAITING_BUSINESS_TIMEOUT_HOURS = 24;
export const AWAITING_CUSTOMER_CONTINUITY_HOURS = 48;
export const COMPLETED_DORMANT_DAYS = 30;

export type ClosureAction =
  | { type: "enqueue_decision"; leadId: string; workspaceId: string; reason: string }
  | { type: "escalate"; leadId: string; workspaceId: string; reason: string }
  | { type: "enqueue_reconciliation"; leadId: string; workspaceId: string; reason: string }
  | { type: "mark_dormant"; leadId: string; workspaceId: string; reason: string };

export interface InvariantContext {
  leadId: string;
  workspaceId: string;
  state: ResponsibilityState;
  lastSignalAt: string | null;
  /** For COMMITMENT_SCHEDULED: event start time from latest booking/appointment. */
  commitmentStartAt: string | null;
}

/**
 * Every active lead must have one responsibility (caller ensures this by resolving).
 * Check time-based invariants and return the action required, or null if none.
 */
export function checkInvariantViolation(ctx: InvariantContext): ClosureAction | null {
  const now = new Date();
  const lastAt = ctx.lastSignalAt ? new Date(ctx.lastSignalAt).getTime() : 0;

  switch (ctx.state) {
    case "AWAITING_BUSINESS_DECISION": {
      const elapsedHours = (now.getTime() - lastAt) / (60 * 60 * 1000);
      if (elapsedHours > AWAITING_BUSINESS_TIMEOUT_HOURS) {
        return { type: "escalate", leadId: ctx.leadId, workspaceId: ctx.workspaceId, reason: "awaiting_business_timeout_24h" };
      }
      return null;
    }
    case "AWAITING_CUSTOMER_RESPONSE": {
      const elapsedHours = (now.getTime() - lastAt) / (60 * 60 * 1000);
      if (elapsedHours > AWAITING_CUSTOMER_CONTINUITY_HOURS) {
        return { type: "enqueue_decision", leadId: ctx.leadId, workspaceId: ctx.workspaceId, reason: "awaiting_customer_continuity_window" };
      }
      return null;
    }
    case "COMMITMENT_SCHEDULED": {
      if (!ctx.commitmentStartAt) return null;
      const eventTime = new Date(ctx.commitmentStartAt).getTime();
      if (now.getTime() > eventTime) {
        return { type: "enqueue_reconciliation", leadId: ctx.leadId, workspaceId: ctx.workspaceId, reason: "commitment_past_event_time" };
      }
      return null;
    }
    case "COMPLETED": {
      const elapsedDays = (now.getTime() - lastAt) / (24 * 60 * 60 * 1000);
      if (elapsedDays > COMPLETED_DORMANT_DAYS) {
        return { type: "mark_dormant", leadId: ctx.leadId, workspaceId: ctx.workspaceId, reason: "completed_stale_lifecycle_return_window" };
      }
      return null;
    }
    default:
      return null;
  }
}

/** Get last signal occurred_at for a lead. */
export async function getLastSignalAt(workspaceId: string, leadId: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("canonical_signals")
    .select("occurred_at")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { occurred_at?: string } | null)?.occurred_at ?? null;
}

/** Get commitment (booking/appointment) start time from latest relevant signal or call_sessions. */
export async function getCommitmentStartAt(workspaceId: string, leadId: string): Promise<string | null> {
  const db = getDb();
  const { data: sig } = await db
    .from("canonical_signals")
    .select("payload, occurred_at")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .in("signal_type", ["BookingCreated", "AppointmentStarted", "BookingModified"])
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sig) {
    const p = (sig as { payload?: { start_at?: string; new_start_at?: string } }).payload;
    const at = p?.new_start_at ?? p?.start_at;
    if (at) return at;
  }
  const { data: session } = await db
    .from("call_sessions")
    .select("call_started_at")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("call_started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (session) {
    const at = (session as { call_started_at?: string }).call_started_at;
    if (at) return at;
  }
  return null;
}
