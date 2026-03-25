/**
 * Thread assignments: responsibility transfer inside the corridor.
 * No delete. One open per (thread_id, assigned_role, assignment_type).
 */

import { getDb } from "@/lib/db/queries";

export type AssignedRole = "originator" | "counterparty" | "downstream";

export type AssignmentType =
  | "perform_work"
  | "verify_outcome"
  | "provide_information"
  | "confirm_delivery";

export async function createAssignment(
  threadId: string,
  assignedRole: AssignedRole,
  assignmentType: AssignmentType
): Promise<void> {
  const db = getDb();
  await db.from("thread_assignments").insert({
    thread_id: threadId,
    assigned_role: assignedRole,
    assignment_type: assignmentType,
  });
}

export async function resolveAssignmentByEvent(
  threadId: string,
  assignmentType: AssignmentType,
  assignedRole: AssignedRole,
  eventId: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: open } = await db
    .from("thread_assignments")
    .select("id")
    .eq("thread_id", threadId)
    .eq("assignment_type", assignmentType)
    .eq("assigned_role", assignedRole)
    .is("resolved_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!open) return;
  await db
    .from("thread_assignments")
    .update({
      resolved_at: now,
      resolved_by_event_id: eventId,
    })
    .eq("id", (open as { id: string }).id);
}

/** True if thread has at least one open assignment. */
export async function threadHasOpenAssignment(threadId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("thread_assignments")
    .select("id")
    .eq("thread_id", threadId)
    .is("resolved_at", null)
    .limit(1)
    .maybeSingle();
  return !!data;
}
