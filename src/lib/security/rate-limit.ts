/**
 * Rate limiting: inbound webhooks + outbound messages.
 * Uses DB for persistence across instances.
 */

import { createHash } from "crypto";
import { getDb } from "@/lib/db/queries";

const INBOUND_LIMIT = 100;
const INBOUND_WINDOW_SEC = 60;
const OUTBOUND_LIMIT_PER_LEAD = 5;
const OUTBOUND_WINDOW_SEC = 86400;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

export async function checkInboundRateLimit(workspaceId: string, ip: string): Promise<boolean> {
  const db = getDb();
  const key = hashKey(`inbound:${workspaceId}:${ip}`);
  const windowStart = new Date(Date.now() - INBOUND_WINDOW_SEC * 1000).toISOString();

  const { data: row } = await db
    .from("rate_limits")
    .select("count, window_start")
    .eq("scope", "webhook_inbound")
    .eq("key_hash", key)
    .single();

  if (!row) return true;

  const r = row as { count: number; window_start: string };
  const elapsed = (Date.now() - new Date(r.window_start).getTime()) / 1000;
  if (elapsed > INBOUND_WINDOW_SEC) return true;
  return r.count < INBOUND_LIMIT;
}

export async function incrementInboundRateLimit(workspaceId: string, ip: string): Promise<void> {
  const db = getDb();
  const key = hashKey(`inbound:${workspaceId}:${ip}`);
  const { data } = await db.from("rate_limits").select("count, window_start").eq("scope", "webhook_inbound").eq("key_hash", key).single();
  const now = new Date().toISOString();
  if (!data) {
    await db.from("rate_limits").insert({ scope: "webhook_inbound", key_hash: key, count: 1, window_start: now });
  } else {
    const r = data as { count: number; window_start: string };
    const elapsed = (Date.now() - new Date(r.window_start).getTime()) / 1000;
    const newCount = elapsed > INBOUND_WINDOW_SEC ? 1 : r.count + 1;
    const newStart = elapsed > INBOUND_WINDOW_SEC ? now : r.window_start;
    await db.from("rate_limits").update({ count: newCount, window_start: newStart }).eq("scope", "webhook_inbound").eq("key_hash", key);
  }
}

export async function checkOutboundRateLimit(workspaceId: string, leadId: string): Promise<boolean> {
  try {
    const db = getDb();
    const since = new Date(Date.now() - OUTBOUND_WINDOW_SEC * 1000).toISOString();
    const { count } = await db
      .from("outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .gte("sent_at", since);
    return (count ?? 0) < OUTBOUND_LIMIT_PER_LEAD;
  } catch {
    return true;
  }
}
