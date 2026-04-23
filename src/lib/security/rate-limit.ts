/**
 * Rate limiting: inbound webhooks + outbound messages.
 * Uses DB for persistence across instances.
 */

import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

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

// ─────────────────────────────────────────────────────────────────────────────
// Per-workspace per-route rate limiter for API mutations.
//
// Goals:
//   - One call-site idiom for API routes — returns a 429 NextResponse ready
//     to return, or `null` to proceed.
//   - Sensible defaults so callers don't have to remember the shape of
//     every limit.
//   - Resilient to the rate_limits table being unavailable (open, not fail
//     closed) — a degraded DB should NOT take down the app.
//   - Includes Retry-After seconds so clients can back off correctly.
//
// The underlying store is still the `rate_limits` table used elsewhere in
// this file, keyed by (scope, key_hash). We pick `scope = "route"` and a
// key that composes {route}:{workspaceId}:{actor} so concurrent tenants
// don't starve each other.
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_SCOPE = "route";

/** Default windows tuned for typical mutation surfaces. Override per-route. */
export const ROUTE_RATE_LIMITS = {
  /** Default mutation limit for authenticated workspace-scoped writes. */
  mutation: { limit: 60, windowSec: 60 },
  /** Higher-volume reads (pagination, search). */
  read: { limit: 300, windowSec: 60 },
  /** Authentication endpoints — tight to discourage credential stuffing. */
  auth: { limit: 10, windowSec: 60 },
  /** Outbound AI calls (agent runs, completions) — limit fan-out per workspace. */
  ai: { limit: 30, windowSec: 60 },
} as const;

export type RouteLimitPreset = keyof typeof ROUTE_RATE_LIMITS;

export interface CheckRouteLimitOpts {
  /** Logical route name, e.g. "team.invite" — used in the key and in logs. */
  route: string;
  /** Tenant scope. When absent, falls back to IP-only (e.g. for unauth routes). */
  workspaceId?: string | null;
  /** Per-actor segmentation (user id or IP). Required for fair sharing. */
  actor: string;
  /** Either a preset name, or explicit limit/window. */
  preset?: RouteLimitPreset;
  limit?: number;
  windowSec?: number;
}

export interface CheckRouteLimitResult {
  /** True if the caller is under the limit and may proceed. */
  ok: boolean;
  /** When !ok, a ready-to-return 429 response with Retry-After set. */
  response?: NextResponse;
  /** Seconds until the current window resets (0 when ok and fresh). */
  retryAfterSec: number;
  /** Remaining calls in the current window (clamped at 0). */
  remaining: number;
}

/**
 * Check (and atomically advance) a per-route rate limit. This is a read-modify-
 * write on the `rate_limits` table. We accept a tiny race window under
 * very high concurrency in exchange for avoiding a Redis dependency — the
 * enforcement is best-effort for abuse control, not a security boundary.
 *
 * Call once per mutation handler:
 *
 *   const rl = await checkRouteRateLimit({
 *     route: "team.invite",
 *     workspaceId: auth.session.workspaceId,
 *     actor: auth.session.userId,
 *     preset: "mutation",
 *   });
 *   if (!rl.ok) return rl.response;
 */
export async function checkRouteRateLimit(
  opts: CheckRouteLimitOpts,
): Promise<CheckRouteLimitResult> {
  const preset = opts.preset ? ROUTE_RATE_LIMITS[opts.preset] : null;
  const limit = opts.limit ?? preset?.limit ?? ROUTE_RATE_LIMITS.mutation.limit;
  const windowSec = opts.windowSec ?? preset?.windowSec ?? ROUTE_RATE_LIMITS.mutation.windowSec;

  if (!opts.route || !opts.actor) {
    // Bad caller — open to avoid stranding the request, but log loudly.
    log("warn", "[rate-limit] checkRouteRateLimit called without route+actor", { route: opts.route });
    return { ok: true, retryAfterSec: 0, remaining: limit };
  }

  const compositeKey = `${ROUTE_SCOPE}:${opts.route}:${opts.workspaceId ?? "-"}:${opts.actor}`;
  const key = hashKey(compositeKey);

  try {
    const db = getDb();
    const { data: row } = await db
      .from("rate_limits")
      .select("count, window_start")
      .eq("scope", ROUTE_SCOPE)
      .eq("key_hash", key)
      .maybeSingle();

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    let currentCount: number;
    let windowStartMs: number;

    if (!row) {
      // First hit in this window — create it at count = 1.
      await db.from("rate_limits").insert({
        scope: ROUTE_SCOPE,
        key_hash: key,
        count: 1,
        window_start: nowIso,
      });
      currentCount = 1;
      windowStartMs = now;
    } else {
      const r = row as { count: number; window_start: string };
      windowStartMs = new Date(r.window_start).getTime();
      const elapsed = (now - windowStartMs) / 1000;
      if (elapsed > windowSec) {
        // Window expired — reset.
        await db
          .from("rate_limits")
          .update({ count: 1, window_start: nowIso })
          .eq("scope", ROUTE_SCOPE)
          .eq("key_hash", key);
        currentCount = 1;
        windowStartMs = now;
      } else {
        currentCount = r.count + 1;
        await db
          .from("rate_limits")
          .update({ count: currentCount })
          .eq("scope", ROUTE_SCOPE)
          .eq("key_hash", key);
      }
    }

    const retryAfterSec = Math.max(0, Math.ceil(windowSec - (now - windowStartMs) / 1000));
    const remaining = Math.max(0, limit - currentCount);

    if (currentCount > limit) {
      log("warn", "[rate-limit] route limit exceeded", {
        route: opts.route,
        workspaceId: opts.workspaceId ?? null,
        // Don't log the raw actor — the key is a hash of (route, ws, actor).
        limit,
        window_sec: windowSec,
        count: currentCount,
      });
      const response = NextResponse.json(
        { error: "Too many requests", retry_after_sec: retryAfterSec },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor((windowStartMs + windowSec * 1000) / 1000)),
          },
        },
      );
      return { ok: false, response, retryAfterSec, remaining: 0 };
    }

    return { ok: true, retryAfterSec, remaining };
  } catch (err) {
    // DB unreachable → fail OPEN with a warning. Rate limiting is abuse
    // control, not an auth gate; taking writes offline because the limiter
    // can't talk to Postgres would be a worse outage than letting requests
    // through.
    log("warn", "[rate-limit] store unavailable — failing open", {
      route: opts.route,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: true, retryAfterSec: 0, remaining: limit };
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
