/**
 * Human override absorption: detect when a human (rep) has acted so we can suppress notifications.
 * Human message = role "assistant" and approved_by_human = true.
 */

import { getDb } from "@/lib/db/queries";

/** True if the lead has at least one human (rep) message after the given time. */
export async function leadHasHumanReplyAfter(
  leadId: string,
  afterIso: string
): Promise<boolean> {
  const db = getDb();
  const { data: conv } = await db
    .from("conversations")
    .select("id")
    .eq("lead_id", leadId)
    .limit(1)
    .single();
  if (!conv) return false;
  const convId = (conv as { id: string }).id;
  const { data: msg } = await db
    .from("messages")
    .select("id")
    .eq("conversation_id", convId)
    .eq("role", "assistant")
    .eq("approved_by_human", true)
    .gt("created_at", afterIso)
    .limit(1)
    .maybeSingle();
  return !!msg;
}

/** True if the lead has a human message in the last N minutes. */
export async function leadHasHumanMessageInLastMinutes(
  leadId: string,
  minutes: number
): Promise<boolean> {
  const db = getDb();
  const after = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const { data: conv } = await db
    .from("conversations")
    .select("id")
    .eq("lead_id", leadId)
    .limit(1)
    .single();
  if (!conv) return false;
  const convId = (conv as { id: string }).id;
  const { data: msg } = await db
    .from("messages")
    .select("id")
    .eq("conversation_id", convId)
    .eq("role", "assistant")
    .eq("approved_by_human", true)
    .gt("created_at", after)
    .limit(1)
    .maybeSingle();
  return !!msg;
}

/** For each escalation (lead_id, created_at), return set of escalation ids that have human reply after. */
export async function escalationIdsWithHumanReplyAfter(
  escalations: { id: string; lead_id: string; created_at: string }[]
): Promise<Set<string>> {
  const out = new Set<string>();
  for (const e of escalations) {
    const has = await leadHasHumanReplyAfter(e.lead_id, e.created_at);
    if (has) out.add(e.id);
  }
  return out;
}

/** Count how many of the given escalations have human reply after escalation. */
export async function countEscalationsWithHumanReply(
  escalations: { id: string; lead_id: string; created_at: string }[]
): Promise<number> {
  const set = await escalationIdsWithHumanReplyAfter(escalations);
  return set.size;
}

/** True iff every active handoff's lead has a human message in the last N minutes. */
export async function allActiveHandoffsTouchedInLastMinutes(
  workspaceId: string,
  minutes: number
): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: rows } = await db
    .from("escalation_logs")
    .select("id, lead_id")
    .eq("workspace_id", workspaceId)
    .eq("holding_message_sent", true)
    .eq("resolved_by_human_pre_notice", false)
    .not("hold_until", "is", null)
    .gt("hold_until", now);
  if (!rows?.length) return true;
  const leads = [...new Set((rows as { lead_id: string }[]).map((r) => r.lead_id))];
  for (const leadId of leads) {
    const touched = await leadHasHumanMessageInLastMinutes(leadId, minutes);
    if (!touched) return false;
  }
  return true;
}

/** True iff every pending handoff has human activity after its escalation created_at. */
export async function everyPendingHandoffHasHumanActivityAfter(
  workspaceId: string
): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: rows } = await db
    .from("escalation_logs")
    .select("id, lead_id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("holding_message_sent", true)
    .eq("resolved_by_human_pre_notice", false)
    .not("hold_until", "is", null)
    .gt("hold_until", now);
  if (!rows?.length) return true;
  const list = rows as { id: string; lead_id: string; created_at: string }[];
  const withHuman = await escalationIdsWithHumanReplyAfter(list);
  return withHuman.size === list.length;
}
