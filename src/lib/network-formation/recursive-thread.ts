/**
 * Recursive thread generation: auto-create new threads from follow-up actions without signup.
 * Network loop: counterparty/downstream actions spawn new work under originator workspace.
 */

import { getDb } from "@/lib/db/queries";
import { createSharedTransaction } from "@/lib/shared-transaction-assurance";
import { recordOrientationStatement } from "@/lib/orientation/records";
import { detectAndAttachReference } from "@/lib/thread-reference-memory";
import { recordOutcomeDependency } from "@/lib/outcome-dependencies";

const SPAWN_ACTIONS = ["schedule_follow_up", "request_adjustment", "assign_third_party", "transfer_responsibility"] as const;

/**
 * Spawn recursive thread if action requires new work and current thread is acknowledged.
 */
export async function spawnRecursiveThreadIfNeeded(
  currentThreadId: string,
  workspaceId: string,
  action: string,
  eventId: string | null,
  actorRole: string
): Promise<void> {
  if (!SPAWN_ACTIONS.includes(action as (typeof SPAWN_ACTIONS)[number])) return;
  if (!eventId) return;
  
  const db = getDb();
  
  const { data: tx } = await db
    .from("shared_transactions")
    .select("state, subject_type, subject_id, counterparty_identifier, acknowledged_at")
    .eq("id", currentThreadId)
    .maybeSingle();
  
  if (!tx) return;
  
  const state = (tx as { state: string }).state;
  if (state !== "acknowledged") return;
  
  const subjectType = (tx as { subject_type: string }).subject_type;
  const subjectId = (tx as { subject_id: string }).subject_id;
  const counterpartyIdentifier = (tx as { counterparty_identifier: string }).counterparty_identifier;
  
  const { data: openResponsibility } = await db
    .from("operational_responsibilities")
    .select("required_action, created_at")
    .eq("thread_id", currentThreadId)
    .eq("satisfied", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!openResponsibility) return;
  
  const requiredAction = (openResponsibility as { required_action: string }).required_action;
  const responsibilityCreatedAt = (openResponsibility as { created_at: string }).created_at;
  
  const { data: event } = await db
    .from("reciprocal_events")
    .select("recorded_at")
    .eq("id", eventId)
    .maybeSingle();
  
  if (!event) return;
  
  const eventTime = new Date((event as { recorded_at: string }).recorded_at).getTime();
  const respTime = new Date(responsibilityCreatedAt).getTime();
  
  if (Math.abs(eventTime - respTime) > 5000) return;
  
  if (requiredAction !== "downstream_act" && requiredAction !== "originator_respond") return;
  
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  
  const newThreadId = await createSharedTransaction({
    workspaceId,
    counterpartyIdentifier: actorRole === "downstream" ? counterpartyIdentifier : `follow-up-${currentThreadId}`,
    subjectType: subjectType as "agreement" | "booking" | "payment" | "delivery" | "job",
    subjectId,
    initiatedBy: "business",
    acknowledgementDeadline: deadline,
  });
  
  if (!newThreadId) return;
  
  await detectAndAttachReference({
    workspaceId,
    referenceContextType: "shared_transaction",
    referenceContextId: newThreadId,
    subjectType,
    subjectId,
    threadId: currentThreadId,
  }).catch(() => {});
  
  await recordOutcomeDependency({
    workspaceId,
    sourceThreadId: currentThreadId,
    dependentContextType: "shared_transaction",
    dependentContextId: newThreadId,
    dependencyType: "prior_outcome_reference",
  }).catch(() => {});
  
  await recordOrientationStatement(workspaceId, "Follow-up work was initiated from a prior record.").catch(() => {});
  await recordOrientationStatement(workspaceId, "This record depends on an earlier confirmed outcome.").catch(() => {});
}
