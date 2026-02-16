/**
 * Return gravity: same counterparty interacts after previous completed thread.
 * Uses thread_reference_memory to detect continuity.
 */

import { getDb } from "@/lib/db/queries";

/**
 * True when this thread's counterparty has a previous acknowledged thread.
 */
export async function hasReturnGravity(threadId: string): Promise<boolean> {
  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("workspace_id, counterparty_identifier")
    .eq("id", threadId)
    .maybeSingle();
  if (!tx) return false;
  const workspaceId = (tx as { workspace_id: string }).workspace_id;
  const counterparty = (tx as { counterparty_identifier: string }).counterparty_identifier;
  const { data: previous } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterparty)
    .eq("state", "acknowledged")
    .neq("id", threadId)
    .order("acknowledged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return !!previous;
}
