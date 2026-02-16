/**
 * Guarantee Layer — evaluate invariants for a lead (deterministic state only).
 * No user-visible scoring. State and timestamps only.
 */

import { getDb } from "@/lib/db/queries";
import type { GuaranteeBreach } from "./invariants";
import {
  RESPONSE_CONTINUITY_MAX_HOURS,
  DECISION_MOMENTUM_MAX_DAYS,
  LIFECYCLE_RETURN_MIN_DAYS,
} from "./invariants";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

export interface LeadContext {
  leadId: string;
  workspaceId: string;
  state: string;
  lastActivityAt: string | null;
  optOut?: boolean;
}

/**
 * Evaluate all five invariants for a single lead. Returns list of breaches.
 */
export async function evaluateGuaranteesForLead(
  ctx: LeadContext
): Promise<GuaranteeBreach[]> {
  const breaches: GuaranteeBreach[] = [];
  const db = getDb();
  const now = Date.now();
  const { leadId, workspaceId, state, lastActivityAt, optOut } = ctx;
  if (optOut) return [];

  const lastActivityMs = lastActivityAt ? new Date(lastActivityAt).getTime() : 0;

  // 1) Response continuity — last inbound unacknowledged beyond human-reasonable delay
  const { data: convRow } = await db
    .from("conversations")
    .select("id")
    .eq("lead_id", leadId)
    .limit(1)
    .single();
  const convId = (convRow as { id?: string } | null)?.id;
  if (convId) {
    const { data: lastUser } = await db
      .from("messages")
      .select("created_at")
      .eq("conversation_id", convId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const { data: lastAssistant } = await db
      .from("messages")
      .select("created_at")
      .eq("conversation_id", convId)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const userAt = (lastUser as { created_at?: string } | null)?.created_at
      ? new Date((lastUser as { created_at: string }).created_at).getTime()
      : 0;
    const assistantAt = (lastAssistant as { created_at?: string } | null)?.created_at
      ? new Date((lastAssistant as { created_at: string }).created_at).getTime()
      : 0;
    if (userAt > 0 && userAt > assistantAt && now - userAt > RESPONSE_CONTINUITY_MAX_HOURS * MS_HOUR) {
      breaches.push({
        invariant: "response_continuity",
        leadId,
        workspaceId,
        reason: "inbound_unacknowledged",
      });
    }
  }

  // 2) Decision momentum — same state too long without progress
  const activeStates = ["CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED"];
  if (activeStates.includes(state) && lastActivityMs > 0 && now - lastActivityMs > DECISION_MOMENTUM_MAX_DAYS * MS_DAY) {
    breaches.push({
      invariant: "decision_momentum",
      leadId,
      workspaceId,
      reason: "stagnation",
    });
  }

  // 3) Attendance stability — booked, ensure stabilizing plan exists and is not overdue
  if (state === "BOOKED") {
    const { data: plan } = await db
      .from("lead_plans")
      .select("next_action_at, next_action_type")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .eq("status", "active")
      .single();
    const planRow = plan as { next_action_at?: string; next_action_type?: string } | null;
    const nextAt = planRow?.next_action_at ? new Date(planRow.next_action_at).getTime() : null;
    const isOverdue = nextAt != null && nextAt < now;
    const isStabilizing =
      planRow?.next_action_type === "reminder" ||
      planRow?.next_action_type === "confirmation" ||
      planRow?.next_action_type === "clarifying_question";
    if (!planRow?.next_action_at || (isOverdue && !isStabilizing)) {
      breaches.push({
        invariant: "attendance_stability",
        leadId,
        workspaceId,
        reason: "booked_no_plan_or_overdue",
      });
    }
  }

  // 4) Recovery persistence — lead should be in recovery path
  if (state === "REACTIVATE" && lastActivityMs > 0 && now - lastActivityMs > 14 * MS_DAY) {
    breaches.push({
      invariant: "recovery_persistence",
      leadId,
      workspaceId,
      reason: "recovery_due",
    });
  }

  // 5) Lifecycle return — attended long ago, return conversation due
  if ((state === "ATTENDED" || state === "REPEAT") && lastActivityMs > 0 && now - lastActivityMs > LIFECYCLE_RETURN_MIN_DAYS * MS_DAY) {
    breaches.push({
      invariant: "lifecycle_return",
      leadId,
      workspaceId,
      reason: "return_timing",
    });
  }

  return breaches;
}

/**
 * Count corrective attempts (no_reply_timeout or similar) for this lead in the last 30 days.
 */
export async function countCorrectiveAttempts(leadId: string): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - 30 * MS_DAY).toISOString();
  const { count } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .eq("event_type", "no_reply_timeout")
    .gte("created_at", since);
  return count ?? 0;
}
