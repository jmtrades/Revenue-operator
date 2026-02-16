/**
 * Handoff acknowledgement: notifications repeat every 10 min until acknowledged.
 * After 30 min unacknowledged, repeat every 5 min. Once acknowledged → stop operator messaging.
 */

import { getDb } from "@/lib/db/queries";

export async function isHandoffAcknowledged(escalationId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("handoff_acknowledgements")
    .select("escalation_id")
    .eq("escalation_id", escalationId)
    .maybeSingle();
  return !!data;
}

export async function recordHandoffAcknowledgement(
  escalationId: string,
  acknowledgedBy?: string
): Promise<void> {
  const db = getDb();
  await db.from("handoff_acknowledgements").upsert(
    { escalation_id: escalationId, acknowledged_by: acknowledgedBy ?? null },
    { onConflict: "escalation_id" }
  );
}

const REPEAT_INTERVAL_MS = 10 * 60 * 1000;
const REPEAT_FAST_MS = 5 * 60 * 1000;
const ESCALATE_AFTER_MS = 30 * 60 * 1000;

/** Escalations due for repeat handoff: already notified, not acked, and interval elapsed (10 min or 5 min if 30+ min since created). */
export async function getEscalationsDueForRepeatHandoff(limit: number): Promise<
  Array<{ id: string; workspace_id: string; lead_id: string; escalation_reason: string; notified_at: string; created_at: string }>
> {
  const db = getDb();
  const now = new Date();
  const nowMs = now.getTime();
  const cutoff = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

  const { data: acks } = await db.from("handoff_acknowledgements").select("escalation_id");
  const ackSet = new Set((acks ?? []).map((r: { escalation_id: string }) => r.escalation_id));

  const { data: rows } = await db
    .from("escalation_logs")
    .select("id, workspace_id, lead_id, escalation_reason, notified_at, created_at")
    .eq("holding_message_sent", true)
    .not("notified_at", "is", null)
    .eq("resolved_by_human_pre_notice", false)
    .gte("created_at", cutoff)
    .order("notified_at", { ascending: true })
    .limit(limit * 2);

  if (!rows?.length) return [];
  const out: Array<{
    id: string;
    workspace_id: string;
    lead_id: string;
    escalation_reason: string;
    notified_at: string;
    created_at: string;
  }> = [];
  for (const r of rows as {
    id: string;
    workspace_id: string;
    lead_id: string;
    escalation_reason: string;
    notified_at: string | null;
    created_at: string;
  }[]) {
    if (ackSet.has(r.id)) continue;
    const notifiedAt = r.notified_at ? new Date(r.notified_at).getTime() : 0;
    const createdAt = new Date(r.created_at).getTime();
    const elapsedSinceCreation = nowMs - createdAt;
    const interval = elapsedSinceCreation >= ESCALATE_AFTER_MS ? REPEAT_FAST_MS : REPEAT_INTERVAL_MS;
    if (nowMs - notifiedAt >= interval) {
      out.push({
        id: r.id,
        workspace_id: r.workspace_id,
        lead_id: r.lead_id,
        escalation_reason: r.escalation_reason,
        notified_at: r.notified_at!,
        created_at: r.created_at,
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}
