/**
 * Global rate guard: max automated sends per workspace per 10 minutes.
 * If exceeded: do not send, create escalation delivery_failed, append protocol outbound_throttled.
 */

import { getDb } from "@/lib/db/queries";

const MAX_SENDS_PER_WINDOW = 20;
const WINDOW_MINUTES = 10;

export async function checkOutboundRateLimit(workspaceId: string): Promise<{ allowed: boolean }> {
  const db = getDb();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await db
    .from("action_commands")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("type", "SendMessage")
    .gte("created_at", since);
  const n = count ?? 0;
  return { allowed: n < MAX_SENDS_PER_WINDOW };
}
