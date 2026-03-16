/**
 * Outbound Event System
 * Signed webhooks, retry with exponential backoff, DLQ for failed events.
 */

import { getDb } from "@/lib/db/queries";

export type OutboundEventType =
  | "lead_qualified"
  | "call_booked"
  | "deal_at_risk"
  | "deal_won"
  | "lead_reactivated";

const EVENT_TOGGLE_MAP: Record<OutboundEventType, string> = {
  lead_qualified: "event_lead_qualified",
  call_booked: "event_call_booked",
  deal_at_risk: "event_deal_at_risk",
  deal_won: "event_deal_won",
  lead_reactivated: "event_lead_reactivated",
};

export async function emitOutboundEvent(
  workspaceId: string,
  eventType: OutboundEventType,
  payload: Record<string, unknown>,
  entityId?: string
): Promise<void> {
  const db = getDb();
  const { data: config } = await db
    .from("webhook_configs")
    .select("endpoint_url, enabled, max_attempts")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!config || !(config as { enabled?: boolean }).enabled) return;

  const toggle = EVENT_TOGGLE_MAP[eventType];
  const { data: cfgFull } = await db
    .from("webhook_configs")
    .select(toggle)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const cfg = cfgFull as Record<string, unknown> | null;
  const enabled = cfg && typeof cfg[toggle] === "boolean" ? cfg[toggle] : true;
  if (!enabled) return;

  const maxAttempts = (config as { max_attempts?: number }).max_attempts ?? 3;
  const { data: inserted } = await db.from("outbound_events_log").insert({
    workspace_id: workspaceId,
    event_type: eventType,
    entity_id: entityId ?? null,
    payload,
    status: "pending",
    attempt_count: 0,
    max_attempts: maxAttempts,
  }).select("id").maybeSingle();

  if (inserted) {
    processWebhookDeliveries().catch(() => {});
  }
}

async function signPayload(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function processWebhookDeliveries(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: pending } = await db
    .from("outbound_events_log")
    .select("id, workspace_id, event_type, entity_id, payload, attempt_count, max_attempts, next_retry_at")
    .eq("status", "pending")
    .limit(50);

  const ready = (pending ?? []).filter(
    (p: { next_retry_at?: string | null }) => !p.next_retry_at || p.next_retry_at <= now
  );

  for (const row of ready) {
    const r = row as { id: string; workspace_id: string; event_type: string; entity_id?: string; payload: unknown; attempt_count: number; max_attempts: number };
    const { data: config } = await db
      .from("webhook_configs")
      .select("endpoint_url, secret, max_attempts")
      .eq("workspace_id", r.workspace_id)
      .maybeSingle();

    if (!config) continue;
    const cfg = config as { endpoint_url: string; secret?: string; max_attempts?: number };
    const attempt = (r.attempt_count ?? 0) + 1;
    const maxAttempts = r.max_attempts ?? cfg.max_attempts ?? 3;

    const body = JSON.stringify({
      event: r.event_type,
      entity_id: r.entity_id,
      payload: r.payload,
      timestamp: new Date().toISOString(),
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Event-Type": r.event_type,
    };

    if (cfg.secret) {
      headers["X-Operator-Signature"] = await signPayload(body, cfg.secret);
    }

    try {
      const res = await fetch(cfg.endpoint_url, { method: "POST", headers, body });
      if (res.ok) {
        await db.from("outbound_events_log").update({
          status: "sent",
          attempt_count: attempt,
          last_error: null,
        }).eq("id", r.id);
      } else {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const delaySec = Math.pow(2, attempt);
      const nextRetry = new Date();
      nextRetry.setSeconds(nextRetry.getSeconds() + delaySec);

      if (attempt >= maxAttempts) {
        await db.from("outbound_events_log").update({
          status: "dlq",
          attempt_count: attempt,
          last_error: errMsg,
        }).eq("id", r.id);
        await db.from("webhook_dlq").insert({
          workspace_id: r.workspace_id,
          event_type: r.event_type,
          entity_id: r.entity_id ?? null,
          payload: r.payload ?? {},
          endpoint_url: cfg.endpoint_url,
          attempt_count: attempt,
          last_error: errMsg,
        });
      } else {
        await db.from("outbound_events_log").update({
          status: "pending",
          attempt_count: attempt,
          next_retry_at: nextRetry.toISOString(),
          last_error: errMsg,
        }).eq("id", r.id);
      }
    }
  }
}
