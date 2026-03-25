/**
 * Query recent handled events and return factual imprint sentences.
 * No totals, no counters. Used sparingly (after absence, weekly summary, first open).
 */

import { getDb } from "@/lib/db/queries";
import { eventToImprint } from "./map";

const MAX_IMPRINTS = 7;
const DAYS_LOOKBACK = 7;

export async function getHandledImprints(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - DAYS_LOOKBACK);

  const { data: events } = await db
    .from("events")
    .select("event_type, entity_id, created_at")
    .eq("workspace_id", workspaceId)
    .in("event_type", ["booking_created", "call_completed", "no_reply_timeout"])
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: actions } = await db
    .from("action_logs")
    .select("entity_id, action, payload, created_at")
    .eq("workspace_id", workspaceId)
    .eq("action", "send_message")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  const actionsByLead: Record<string, Array<{ action: string; created_at: string }>> = {};
  for (const a of actions ?? []) {
    const row = a as { entity_id: string; payload?: { action?: string; simulated?: boolean }; created_at: string };
    const innerAction = row.payload?.action;
    if (!innerAction || row.payload?.simulated) continue;
    if (!["recovery", "win_back", "reminder", "prep_info", "booking", "call_invite", "follow_up"].includes(innerAction)) continue;
    const aid = row.entity_id;
    if (!actionsByLead[aid]) actionsByLead[aid] = [];
    actionsByLead[aid].push({ action: innerAction, created_at: row.created_at });
  }
  for (const aid of Object.keys(actionsByLead)) {
    actionsByLead[aid].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
  }

  const attributionLabels: Record<string, string> = {
    recovery: "Follow-through restored",
    win_back: "Customer returned",
    reminder: "Reminder",
    prep_info: "Prep info",
    booking: "Booking link",
    call_invite: "Call invite",
    follow_up: "Follow-up",
  };

  function getAttribution(leadId: string, beforeTime: string): string | undefined {
    const list = actionsByLead[leadId];
    if (!list) return undefined;
    const eventTime = new Date(beforeTime).getTime();
    const prior = list.find((x) => new Date(x.created_at).getTime() < eventTime);
    if (!prior) return undefined;
    return attributionLabels[prior.action] ?? prior.action;
  }

  const imprints: string[] = [];
  const seen = new Set<string>();

  for (const e of events ?? []) {
    const row = e as { event_type: string; entity_id: string; created_at: string };
    const attributedTo =
      row.event_type === "booking_created" || row.event_type === "call_completed"
        ? getAttribution(row.entity_id, row.created_at)
        : undefined;
    const sentence = eventToImprint(row.event_type, attributedTo);
    if (sentence && !seen.has(sentence)) {
      seen.add(sentence);
      imprints.push(sentence);
      if (imprints.length >= MAX_IMPRINTS) break;
    }
  }

  return imprints;
}
