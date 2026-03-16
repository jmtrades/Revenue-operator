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
  const _windowStart = new Date(Date.now() - INBOUND_WINDOW_SEC * 1000).toISOString();

  const { data: row } = await db
    .from("rate_limits")
    .select("count, window_start")
    .eq("scope", "webhook_inbound")
    .eq("key_hash", key)
    .maybeSingle();

  if (!row) return true;

  const r = row as { count: number; window_start: string };
  const elapsed = (Date.now() - new Date(r.window_start).getTime()) / 1000;
  if (elapsed > INBOUND_WINDOW_SEC) return true;
  return r.count < INBOUND_LIMIT;
}

export async function incrementInboundRateLimit(workspaceId: string, ip: string): Promise<void> {
  const db = getDb();
  const key = hashKey(`inbound:${workspaceId}:${ip}`);
  const { data } = await db.from("rate_limits").select("count, window_start").eq("scope", "webhook_inbound").eq("key_hash", key).maybeSingle();
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

const PUBLIC_RECORD_SCOPE = "public_record";
const PUBLIC_RECORD_404_SCOPE = "public_record_404";
const PUBLIC_RECORD_WINDOW_SEC = 60;
const PUBLIC_RECORD_LIMIT = 30;
const PUBLIC_RECORD_404_WINDOW_SEC = 300;
const PUBLIC_RECORD_404_THRESHOLD = 15;

/** Hash IP for storage; never log or store raw IP. */
export function hashIpForPublicRecord(ip: string): string {
  return hashKey(`ip:${ip}`);
}

/** Check rate limit for public record by (ip_hash, external_ref). Returns true if allowed. */
export async function checkPublicRecordRateLimit(ipHash: string, externalRef: string): Promise<boolean> {
  const db = getDb();
  const key = hashKey(`${PUBLIC_RECORD_SCOPE}:${ipHash}:${externalRef}`);
  const _windowStart = new Date(Date.now() - PUBLIC_RECORD_WINDOW_SEC * 1000).toISOString();
  const { data: row } = await db
    .from("rate_limits")
    .select("count, window_start")
    .eq("scope", PUBLIC_RECORD_SCOPE)
    .eq("key_hash", key)
    .maybeSingle();
  if (!row) return true;
  const r = row as { count: number; window_start: string };
  const elapsed = (Date.now() - new Date(r.window_start).getTime()) / 1000;
  if (elapsed > PUBLIC_RECORD_WINDOW_SEC) return true;
  return r.count < PUBLIC_RECORD_LIMIT;
}

/** Increment public record request count (call after check). */
export async function incrementPublicRecordRateLimit(ipHash: string, externalRef: string): Promise<void> {
  const db = getDb();
  const key = hashKey(`${PUBLIC_RECORD_SCOPE}:${ipHash}:${externalRef}`);
  const { data } = await db.from("rate_limits").select("count, window_start").eq("scope", PUBLIC_RECORD_SCOPE).eq("key_hash", key).maybeSingle();
  const now = new Date().toISOString();
  if (!data) {
    await db.from("rate_limits").insert({ scope: PUBLIC_RECORD_SCOPE, key_hash: key, count: 1, window_start: now });
  } else {
    const r = data as { count: number; window_start: string };
    const elapsed = (Date.now() - new Date(r.window_start).getTime()) / 1000;
    const newCount = elapsed > PUBLIC_RECORD_WINDOW_SEC ? 1 : r.count + 1;
    const newStart = elapsed > PUBLIC_RECORD_WINDOW_SEC ? now : r.window_start;
    await db.from("rate_limits").update({ count: newCount, window_start: newStart }).eq("scope", PUBLIC_RECORD_SCOPE).eq("key_hash", key);
  }
}

/** Record a 404 for this IP hash. Returns true if 404 count in window now exceeds threshold (caller should return neutral). */
export async function recordPublicRecord404(ipHash: string): Promise<{ overThreshold: boolean }> {
  const db = getDb();
  const key = hashKey(`${PUBLIC_RECORD_404_SCOPE}:${ipHash}`);
  const { data } = await db.from("rate_limits").select("count, window_start").eq("scope", PUBLIC_RECORD_404_SCOPE).eq("key_hash", key).maybeSingle();
  const now = new Date().toISOString();
  let newCount: number;
  let newStart: string;
  if (!data) {
    newCount = 1;
    newStart = now;
    await db.from("rate_limits").insert({ scope: PUBLIC_RECORD_404_SCOPE, key_hash: key, count: 1, window_start: now });
  } else {
    const r = data as { count: number; window_start: string };
    const elapsed = (Date.now() - new Date(r.window_start).getTime()) / 1000;
    newCount = elapsed > PUBLIC_RECORD_404_WINDOW_SEC ? 1 : r.count + 1;
    newStart = elapsed > PUBLIC_RECORD_404_WINDOW_SEC ? now : r.window_start;
    await db.from("rate_limits").update({ count: newCount, window_start: newStart }).eq("scope", PUBLIC_RECORD_404_SCOPE).eq("key_hash", key);
  }
  return { overThreshold: newCount >= PUBLIC_RECORD_404_THRESHOLD };
}
