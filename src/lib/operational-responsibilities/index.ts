/**
 * Operational responsibilities: what still requires action per thread.
 * Create at event time; resolve when matching reciprocal_event occurs. Never delete.
 * Deterministic. No heuristics.
 */

import { getDb } from "@/lib/db/queries";
import { getReciprocalEventById } from "@/lib/reciprocal-events";
import { recordOutcomeDependency, refreshResolvedAtForThread } from "@/lib/outcome-dependencies";
import { createAssignment } from "@/lib/thread-assignments";

export type AssignedRole = "originator" | "counterparty" | "downstream" | "observer";

/** Canonical required_action values. One open per (thread_id, required_action). */
export type RequiredAction =
  | "originator_respond"
  | "both_attend"
  | "downstream_act"
  | "assigned_complete"
  | "originator_verify"
  | "coordination_required"
  | "confirmation_required";

const EVENT_TO_RESPONSIBILITY: Record<
  string,
  { assigned_role: AssignedRole; required_action: RequiredAction } | { assigned_role: AssignedRole; required_action: RequiredAction }[]
> = {
  request_adjustment: { assigned_role: "originator", required_action: "originator_respond" },
  schedule_follow_up: { assigned_role: "counterparty", required_action: "both_attend" },
  approve_next_step: { assigned_role: "downstream", required_action: "downstream_act" },
  acknowledge_responsibility: { assigned_role: "counterparty", required_action: "assigned_complete" },
  attach_outcome_evidence: { assigned_role: "originator", required_action: "originator_verify" },
  disputed: { assigned_role: "counterparty", required_action: "coordination_required" },
  rescheduled: { assigned_role: "counterparty", required_action: "confirmation_required" },
  assign_third_party: { assigned_role: "downstream", required_action: "downstream_act" },
  transfer_responsibility: { assigned_role: "counterparty", required_action: "assigned_complete" },
};

/** Events that satisfy an open responsibility (by role or action). */
const SATISFIES: Record<string, RequiredAction[]> = {
  provide_information: ["originator_respond", "coordination_required"],
  acknowledged: ["confirmation_required", "assigned_complete"],
  created: [],
};
const ORIGINATOR_ACTIONS_SUPPORT_RESPOND: string[] = ["provide_information", "request_adjustment"];
const COUNTERPARTY_ACTIONS_SUPPORT_ATTEND: string[] = ["acknowledged", "schedule_follow_up"];

/**
 * Create one open responsibility for the given event type if mapping exists.
 * Enforces one open per (thread_id, required_action) via unique index.
 */
export async function createResponsibilityForEvent(
  threadId: string,
  assignedRole: AssignedRole,
  requiredAction: RequiredAction
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("operational_responsibilities")
    .insert({
      thread_id: threadId,
      assigned_role: assignedRole,
      required_action: requiredAction,
      satisfied: false,
      created_at: now,
    });
}

/**
 * Resolve an open responsibility by linking the satisfying event. Only first open match per (thread_id, required_action).
 */
export async function resolveResponsibilityByEvent(
  threadId: string,
  requiredAction: RequiredAction,
  eventId: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: open } = await db
    .from("operational_responsibilities")
    .select("id, assigned_role")
    .eq("thread_id", threadId)
    .eq("required_action", requiredAction)
    .eq("satisfied", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!open) return;
  const id = (open as { id: string }).id;
  const assignedRole = (open as { assigned_role: string }).assigned_role;
  await db
    .from("operational_responsibilities")
    .update({
      satisfied: true,
      satisfied_by_event_id: eventId,
      resolved_at: now,
    })
    .eq("id", id);
  
  const { data: event } = await db
    .from("reciprocal_events")
    .select("actor_role, operational_action")
    .eq("id", eventId)
    .maybeSingle();
  
  if (event && (assignedRole === "originator" || assignedRole === "counterparty")) {
    const actorRole = (event as { actor_role: string }).actor_role;
    const operationalAction = (event as { operational_action: string }).operational_action;
    if (actorRole === "downstream") {
      const { data: tx } = await db
        .from("shared_transactions")
        .select("workspace_id")
        .eq("id", threadId)
        .maybeSingle();
      if (tx) {
        const workspaceId = (tx as { workspace_id: string }).workspace_id;
        const { detectAndRecordAuthorityTransfer } = await import("@/lib/third-party-reliance/authority-transfer");
        await detectAndRecordAuthorityTransfer(threadId, workspaceId, operationalAction, eventId).catch(() => {});
      }
    }
  }
}

/**
 * After recording a reciprocal event: create responsibility from mapping and optionally resolve one.
 */
export async function onReciprocalEvent(
  threadId: string,
  eventId: string,
  actorRole: AssignedRole,
  operationalAction: string
): Promise<void> {
  // Create responsibility from mapping
  const mapping = EVENT_TO_RESPONSIBILITY[operationalAction];
  if (mapping) {
    const entries = Array.isArray(mapping) ? mapping : [mapping];
    for (const e of entries) {
      try {
        await createResponsibilityForEvent(threadId, e.assigned_role, e.required_action);
      } catch {
        // Unique violation: already one open per (thread_id, required_action); ignore
      }
    }
  }

  // Create thread assignment when federation actions occur (one open per role+type)
  if (operationalAction === "assign_third_party") {
    try {
      await createAssignment(threadId, "downstream", "perform_work");
    } catch {
      // Unique violation: already open; ignore
    }
  }
  if (operationalAction === "transfer_responsibility") {
    try {
      await createAssignment(threadId, "counterparty", "confirm_delivery");
    } catch {
      // Unique violation: already open; ignore
    }
  }

  // Resolve if this event satisfies an open responsibility
  const toResolve = SATISFIES[operationalAction];
  if (toResolve?.length) {
    for (const action of toResolve) {
      await resolveResponsibilityByEvent(threadId, action, eventId);
    }
  }
  if (actorRole === "originator" && ORIGINATOR_ACTIONS_SUPPORT_RESPOND.includes(operationalAction)) {
    await resolveResponsibilityByEvent(threadId, "originator_respond", eventId);
  }
  if (actorRole === "counterparty" && COUNTERPARTY_ACTIONS_SUPPORT_ATTEND.includes(operationalAction)) {
    await resolveResponsibilityByEvent(threadId, "both_attend", eventId);
  }

  // Refresh outcome_dependencies.resolved_at when thread may now be fully resolved
  await refreshResolvedAtForThread(threadId).catch(() => {});

  // Record outcome dependency when event carries a created dependency (e.g. follow-up thread)
  const event = await getReciprocalEventById(eventId);
  if (event?.operational_action === "schedule_follow_up" && event.dependency_created) {
    const { data: row } = await getDb()
      .from("shared_transactions")
      .select("workspace_id")
      .eq("id", threadId)
      .maybeSingle();
    const workspaceId = (row as { workspace_id: string } | null)?.workspace_id;
    if (workspaceId) {
      await recordOutcomeDependency({
        workspaceId,
        sourceThreadId: threadId,
        dependentContextType: "shared_transaction",
        dependentContextId: event.dependency_created,
        dependencyType: "downstream_commitment",
      }).catch(() => {});
    }
  }
}

/**
 * Deterministic: true if thread has at least one unsatisfied responsibility.
 */
export async function threadUnresolved(threadId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("operational_responsibilities")
    .select("id")
    .eq("thread_id", threadId)
    .eq("satisfied", false)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * Deterministic: true if workspace has at least one thread where ≥2 distinct actor_roles have satisfied responsibilities.
 */
export async function crossPartyRelianceEstablished(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (!threads?.length) return false;
  for (const t of threads as { id: string }[]) {
    const { data: roles } = await db
      .from("operational_responsibilities")
      .select("assigned_role")
      .eq("thread_id", t.id)
      .eq("satisfied", true);
    const distinct = new Set((roles ?? []).map((r: { assigned_role: string }) => r.assigned_role));
    if (distinct.size >= 2) return true;
  }
  return false;
}

const MAX_STATEMENT_LEN = 90;

/** Doctrine-safe statement when a required action remains incomplete. Situation. */
export const STATEMENT_REQUIRED_ACTION_INCOMPLETE = "A required action remains incomplete.";
/** Doctrine-safe statement when coordination depends on the record. Presence. */
export const STATEMENT_COORDINATION_DEPENDS = "Coordination currently depends on the record.";
/** Doctrine-safe statement when pending responsibility exists. Public Work. */
export const STATEMENT_PENDING_RESPONSIBILITY = "Pending responsibility exists.";
/** Completion elsewhere affects this outcome. Situation (external dependence). */
export const STATEMENT_COMPLETION_ELSEWHERE_AFFECTS = "Completion elsewhere affects this outcome.";
/** Work relies on resolution outside this record. Presence (external dependence). */
export const STATEMENT_WORK_RELIES_OUTSIDE = "Work relies on resolution outside this record.";
/** An external reference remains unresolved. Record (external dependence). */
export const STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED = "An external reference remains unresolved.";
/** If removed, dependent work becomes uncertain. Disable impact (external dependence). */
export const STATEMENT_DEPENDENT_WORK_UNCERTAIN = "If removed, dependent work becomes uncertain.";
/** A related outcome remains unresolved. Ambient (thread propagates uncertainty). */
export const STATEMENT_RELATED_OUTCOME_UNRESOLVED = "A related outcome remains unresolved.";
/** Responsibility was assigned within the record. Federation. */
export const STATEMENT_RESPONSIBILITY_ASSIGNED = "Responsibility was assigned within the record.";
/** Responsibility transferred within the record. Federation. */
export const STATEMENT_RESPONSIBILITY_TRANSFERRED = "Responsibility transferred within the record.";
/** An assigned obligation remains unresolved. Federation. */
export const STATEMENT_ASSIGNED_OBLIGATION_UNRESOLVED = "An assigned obligation remains unresolved.";
/** Coordination occurred across participants. Presence (federation). */
export const STATEMENT_COORDINATION_OCCURRED = "Coordination occurred across participants.";

function cap(s: string): string {
  return s.length > MAX_STATEMENT_LEN ? s.slice(0, MAX_STATEMENT_LEN).trim() : s;
}

/** Situation line: show when workspace has unresolved responsibility. */
export function getSituationStatement(): string {
  return cap(STATEMENT_REQUIRED_ACTION_INCOMPLETE);
}

/** Presence line: show when workspace has unresolved responsibility. */
export function getPresenceStatement(): string {
  return cap(STATEMENT_COORDINATION_DEPENDS);
}

/** Public work line: show when thread has unresolved responsibility. */
export function getPublicWorkStatement(): string {
  return cap(STATEMENT_PENDING_RESPONSIBILITY);
}

/**
 * True if workspace has any thread with an open responsibility (for doctrine statements).
 */
export async function workspaceHasUnresolvedResponsibility(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (!threads?.length) return false;
  const threadIds = (threads as { id: string }[]).map((x) => x.id);
  const { data: open } = await db
    .from("operational_responsibilities")
    .select("id")
    .eq("satisfied", false)
    .in("thread_id", threadIds)
    .limit(1)
    .maybeSingle();
  return !!open;
}
