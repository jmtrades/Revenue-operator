/**
 * Escalation memory — bounded queries for escalation summary. No DELETE. ORDER BY + LIMIT only.
 */

import { getDb } from "@/lib/db/queries";
import { getOpenCommitments } from "./commitment-registry";
import { getBrokenCommitmentsCount } from "./commitment-registry";

const LAST_ACTIONS_LIMIT = 3;

export interface LastActionRow {
  intent_type: string;
  created_at: string;
}

/**
 * Get last N intent actions for thread. Bounded: ORDER BY created_at DESC LIMIT N.
 */
export async function getLastNIntentActions(
  workspaceId: string,
  threadId: string,
  limit: number = LAST_ACTIONS_LIMIT
): Promise<Array<{ intent_type: string; at?: string }>> {
  const db = getDb();
  const cap = Math.min(10, Math.max(1, limit));
  const { data } = await db
    .from("action_intents")
    .select("intent_type, created_at")
    .eq("workspace_id", workspaceId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(cap);
  return (data ?? []).map((r: { intent_type: string; created_at?: string }) => ({
    intent_type: r.intent_type,
    at: r.created_at ?? undefined,
  }));
}

export interface EscalationContext {
  openCommitments: Awaited<ReturnType<typeof getOpenCommitments>>;
  brokenCount: number;
  last3Actions: Array<{ intent_type: string; at?: string }>;
}

/**
 * Load escalation context for a thread. All queries bounded.
 */
export async function getEscalationContext(
  workspaceId: string,
  threadId: string
): Promise<EscalationContext> {
  const [openCommitments, brokenCount, last3Actions] = await Promise.all([
    getOpenCommitments(workspaceId, threadId),
    getBrokenCommitmentsCount(workspaceId, threadId),
    getLastNIntentActions(workspaceId, threadId, LAST_ACTIONS_LIMIT),
  ]);
  return { openCommitments, brokenCount, last3Actions };
}
