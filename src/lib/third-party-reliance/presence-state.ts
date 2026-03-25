/**
 * Reliance presence state: detect when threads have observer events, downstream resolution, or cross-participant references.
 */

import { getDb } from "@/lib/db/queries";

/**
 * True when any thread in workspace has observer events, downstream responsibility resolution, or reference across participants.
 */
export async function hasThirdPartyReliance(workspaceId: string): Promise<boolean> {
  const db = getDb();
  
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId);
  
  if (!threads || threads.length === 0) return false;
  
  const threadIds = (threads as { id: string }[]).map((t) => t.id);
  
  const { data: observerEvents } = await db
    .from("reciprocal_events")
    .select("id")
    .in("thread_id", threadIds)
    .eq("actor_role", "observer")
    .limit(1)
    .maybeSingle();
  
  if (observerEvents) return true;
  
  const { data: responsibilities } = await db
    .from("operational_responsibilities")
    .select("assigned_role, satisfied_by_event_id")
    .in("thread_id", threadIds)
    .eq("satisfied", true)
    .limit(50);
  
  if (responsibilities && responsibilities.length > 0) {
    for (const resp of responsibilities) {
      const assignedRole = (resp as { assigned_role: string }).assigned_role;
      const eventId = (resp as { satisfied_by_event_id: string | null }).satisfied_by_event_id;
      if ((assignedRole === "originator" || assignedRole === "counterparty") && eventId) {
        const { data: event } = await db
          .from("reciprocal_events")
          .select("actor_role")
          .eq("id", eventId)
          .maybeSingle();
        if (event && (event as { actor_role: string }).actor_role === "downstream") {
          return true;
        }
      }
    }
  }
  
  const { data: refs } = await db
    .from("thread_reference_memory")
    .select("thread_id, reference_context_id")
    .eq("workspace_id", workspaceId)
    .limit(50);
  
  if (refs && refs.length > 0) {
    const seenPairs = new Set<string>();
    for (const ref of refs) {
      const threadId = (ref as { thread_id: string }).thread_id;
      const refContextId = (ref as { reference_context_id: string }).reference_context_id;
      const pairKey = `${threadId}:${refContextId}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      
      const { data: thread1 } = await db
        .from("shared_transactions")
        .select("counterparty_identifier")
        .eq("id", threadId)
        .maybeSingle();
      const { data: thread2 } = await db
        .from("shared_transactions")
        .select("counterparty_identifier")
        .eq("id", refContextId)
        .maybeSingle();
      if (thread1 && thread2) {
        const cp1 = (thread1 as { counterparty_identifier: string }).counterparty_identifier;
        const cp2 = (thread2 as { counterparty_identifier: string }).counterparty_identifier;
        if (cp1 !== cp2) return true;
      }
    }
  }
  
  return false;
}
