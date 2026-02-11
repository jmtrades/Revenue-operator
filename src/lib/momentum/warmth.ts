/**
 * Warmth score: relationship built from interactions, revivals, replies, objections.
 */

import { getDb } from "@/lib/db/queries";
import { getLeadMemory } from "@/lib/lead-memory";

export async function getWarmthScores(
  workspaceId: string,
  leadIds: string[]
): Promise<Record<string, number>> {
  if (leadIds.length === 0) return {};

  const db = getDb();
  const result: Record<string, number> = {};

  const { data: actionCounts } = await db
    .from("action_logs")
    .select("entity_id")
    .eq("workspace_id", workspaceId)
    .in("entity_id", leadIds);

  const actionByLead: Record<string, number> = {};
  for (const row of actionCounts ?? []) {
    const eid = (row as { entity_id: string }).entity_id;
    actionByLead[eid] = (actionByLead[eid] ?? 0) + 1;
  }

  const { data: revivalEvents } = await db
    .from("events")
    .select("entity_id, payload")
    .eq("workspace_id", workspaceId)
    .eq("event_type", "message_received")
    .in("entity_id", leadIds);

  const revivalsByLead: Record<string, number> = {};
  for (const e of revivalEvents ?? []) {
    const d = (e as { payload?: { decision?: { newState?: string; fromState?: string } } }).payload?.decision;
    if (d?.newState === "ENGAGED" && d?.fromState === "REACTIVATE") {
      const eid = (e as { entity_id: string }).entity_id;
      revivalsByLead[eid] = (revivalsByLead[eid] ?? 0) + 1;
    }
  }

  const { data: convs } = await db.from("conversations").select("id, lead_id").in("lead_id", leadIds);
  const convByLead = ((convs ?? []) as { id: string; lead_id: string }[]).reduce(
    (acc, c) => { acc[c.lead_id] = c.id; return acc; },
    {} as Record<string, string>
  );

  const convIds = Object.values(convByLead);
  const repliesByLead: Record<string, number> = {};
  if (convIds.length > 0) {
    const { data: msgs } = await db
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .eq("role", "user");
    const countByConv: Record<string, number> = {};
    for (const m of msgs ?? []) {
      const cid = (m as { conversation_id: string }).conversation_id;
      countByConv[cid] = (countByConv[cid] ?? 0) + 1;
    }
    for (const [leadId, convId] of Object.entries(convByLead)) {
      repliesByLead[leadId] = countByConv[convId] ?? 0;
    }
  }

  for (const lid of leadIds) {
    const objMem = await getLeadMemory(lid, "objections_raised");
    const objectionsCount = Array.isArray(objMem?.objections) ? objMem.objections.length : 0;

    const score = computeWarmth(
      actionByLead[lid] ?? 0,
      revivalsByLead[lid] ?? 0,
      repliesByLead[lid] ?? 0,
      objectionsCount
    );
    result[lid] = score;
  }

  return result;
}

function computeWarmth(
  interactions: number,
  revivals: number,
  replies: number,
  objectionsHandled: number
): number {
  const cap = (v: number, max: number) => Math.min(max, v);
  const score =
    10 +
    cap(interactions * 3, 25) +
    cap(revivals * 15, 30) +
    cap(replies * 2, 25) +
    cap(objectionsHandled * 5, 15);
  return Math.min(100, Math.round(score));
}
