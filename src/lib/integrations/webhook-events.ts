/**
 * Webhook Event Delivery System
 *
 * Fires real-time webhook events to customer-configured endpoints.
 * Supports retry logic, HMAC signing, and event filtering.
 *
 * Events:
 * - call.started, call.completed, call.failed
 * - lead.created, lead.updated, lead.scored
 * - nps.received
 * - sequence.enrolled, sequence.completed
 * - appointment.booked, appointment.cancelled
 * - voicemail.detected, voicemail.dropped
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import crypto from "crypto";

/* ── Event Types ─────────────────────────────────────────────────── */

export type WebhookEventType =
  | "call.started"
  | "call.completed"
  | "call.failed"
  | "call.voicemail_detected"
  | "call.voicemail_dropped"
  | "call.transferred"
  | "lead.created"
  | "lead.updated"
  | "lead.scored"
  | "lead.status_changed"
  | "nps.received"
  | "sequence.enrolled"
  | "sequence.step_completed"
  | "sequence.completed"
  | "sequence.unsubscribed"
  | "appointment.booked"
  | "appointment.cancelled"
  | "appointment.rescheduled"
  | "sms.received"
  | "sms.sent"
  | "email.sent"
  | "email.opened"
  | "email.bounced";

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  workspace_id: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface WebhookEndpoint {
  id: string;
  workspace_id: string;
  url: string;
  secret: string;
  events: WebhookEventType[] | ["*"]; // "*" = all events
  enabled: boolean;
  description?: string;
  created_at: string;
  failure_count: number;
  last_success_at?: string;
  last_failure_at?: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_id: string;
  event_type: WebhookEventType;
  status: "pending" | "delivered" | "failed" | "retrying";
  attempts: number;
  max_attempts: number;
  next_retry_at?: string;
  response_status?: number;
  response_body?: string;
  error?: string;
  delivered_at?: string;
  created_at: string;
}

/* ── Core Functions ──────────────────────────────────────────────── */

/**
 * Fire a webhook event to all matching endpoints for a workspace.
 * Non-blocking — failures are logged but never propagate.
 */
export async function fireWebhookEvent(
  workspaceId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const event: WebhookEvent = {
    id: eventId,
    type: eventType,
    workspace_id: workspaceId,
    timestamp: new Date().toISOString(),
    data,
    metadata,
  };

  try {
    const db = getDb();

    // Find active endpoints that subscribe to this event type
    const { data: endpoints } = await db
      .from("webhook_endpoints")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("enabled", true);

    const endpointList = (endpoints ?? []) as unknown as WebhookEndpoint[];

    // Filter to endpoints that subscribe to this event
    const matchingEndpoints = endpointList.filter((ep) => {
      if (!ep.events || ep.events.length === 0) return false;
      if (ep.events[0] === "*") return true;
      return (ep.events as string[]).includes(eventType);
    });

    if (matchingEndpoints.length === 0) return;

    log("info", "webhook_events.firing", {
      eventId,
      eventType,
      workspaceId,
      endpointCount: matchingEndpoints.length,
    });

    // Deliver to all matching endpoints concurrently
    const deliveryPromises = matchingEndpoints.map((ep) =>
      deliverToEndpoint(ep, event).catch((err) => {
        log("warn", "webhook_events.delivery_error", {
          eventId,
          endpointId: ep.id,
          error: err instanceof Error ? err.message : String(err),
        });
      })
    );

    await Promise.allSettled(deliveryPromises);
  } catch (err) {
    log("error", "webhook_events.fire_failed", {
      eventId,
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Deliver a single event to a single endpoint with HMAC signing.
 */
async function deliverToEndpoint(
  endpoint: WebhookEndpoint,
  event: WebhookEvent,
): Promise<void> {
  const payload = JSON.stringify(event);
  const signature = signPayload(payload, endpoint.secret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const resp = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Revenue-Operator-Signature": signature,
        "X-Revenue-Operator-Event": event.type,
        "X-Revenue-Operator-Event-Id": event.id,
        "X-Revenue-Operator-Timestamp": event.timestamp,
        "User-Agent": "RevenueOperator-Webhooks/1.0",
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const db = getDb();

    if (resp.ok) {
      // Success — reset failure count
      await db
        .from("webhook_endpoints")
        .update({
          failure_count: 0,
          last_success_at: new Date().toISOString(),
        })
        .eq("id", endpoint.id);

      log("info", "webhook_events.delivered", {
        eventId: event.id,
        endpointId: endpoint.id,
        status: resp.status,
      });
    } else {
      // Failed — increment failure count, disable after 50 consecutive failures
      const newCount = (endpoint.failure_count ?? 0) + 1;
      const shouldDisable = newCount >= 50;

      await db
        .from("webhook_endpoints")
        .update({
          failure_count: newCount,
          last_failure_at: new Date().toISOString(),
          ...(shouldDisable ? { enabled: false } : {}),
        })
        .eq("id", endpoint.id);

      if (shouldDisable) {
        log("warn", "webhook_events.endpoint_disabled", {
          endpointId: endpoint.id,
          reason: "50_consecutive_failures",
        });
      }

      // Queue for retry
      await queueRetry(endpoint.id, event, newCount);
    }
  } catch (fetchErr) {
    clearTimeout(timeout);

    const db = getDb();
    const newCount = (endpoint.failure_count ?? 0) + 1;

    await db
      .from("webhook_endpoints")
      .update({
        failure_count: newCount,
        last_failure_at: new Date().toISOString(),
      })
      .eq("id", endpoint.id);

    await queueRetry(endpoint.id, event, newCount);

    log("warn", "webhook_events.fetch_failed", {
      eventId: event.id,
      endpointId: endpoint.id,
      error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
    });
  }
}

/**
 * HMAC-SHA256 signature for payload verification.
 * Customers verify: HMAC-SHA256(payload, secret) === X-Recall-Touch-Signature
 */
function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload, "utf-8")
    .digest("hex");
}

/**
 * Queue a failed delivery for exponential backoff retry.
 * Retries: 1m, 5m, 30m, 2h, 12h (max 5 attempts).
 */
async function queueRetry(
  endpointId: string,
  event: WebhookEvent,
  attemptNumber: number,
): Promise<void> {
  if (attemptNumber > 5) return; // Give up after 5 attempts

  const backoffMs = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
  const delay = backoffMs[Math.min(attemptNumber - 1, backoffMs.length - 1)];
  const nextRetry = new Date(Date.now() + delay).toISOString();

  try {
    const db = getDb();
    await db.from("webhook_deliveries").insert({
      endpoint_id: endpointId,
      event_id: event.id,
      event_type: event.type,
      event_payload: event,
      status: "retrying",
      attempts: attemptNumber,
      max_attempts: 5,
      next_retry_at: nextRetry,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    log("warn", "webhook_events.queue_retry_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/* ── Retry Processor (called from cron) ─────────────────────────── */

/**
 * Process queued webhook retries. Called from /api/cron/webhook-retries.
 */
export async function processWebhookRetries(): Promise<number> {
  const db = getDb();
  let processed = 0;

  try {
    const { data: pending } = await db
      .from("webhook_deliveries")
      .select("*")
      .eq("status", "retrying")
      .lte("next_retry_at", new Date().toISOString())
      .limit(50);

    const deliveries = (pending ?? []) as Array<{
      id: string;
      endpoint_id: string;
      event_payload: WebhookEvent;
      attempts: number;
      max_attempts: number;
    }>;

    for (const delivery of deliveries) {
      // Load endpoint
      const { data: ep } = await db
        .from("webhook_endpoints")
        .select("*")
        .eq("id", delivery.endpoint_id)
        .eq("enabled", true)
        .maybeSingle();

      if (!ep) {
        // Endpoint deleted or disabled
        await db.from("webhook_deliveries").update({ status: "failed" }).eq("id", delivery.id);
        continue;
      }

      const endpoint = ep as unknown as WebhookEndpoint;

      try {
        const payload = JSON.stringify(delivery.event_payload);
        const signature = signPayload(payload, endpoint.secret);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const resp = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Revenue-Operator-Signature": signature,
            "X-Revenue-Operator-Event": delivery.event_payload.type,
            "X-Revenue-Operator-Event-Id": delivery.event_payload.id,
            "X-Revenue-Operator-Timestamp": delivery.event_payload.timestamp,
            "X-Revenue-Operator-Retry-Count": String(delivery.attempts),
            "User-Agent": "RevenueOperator-Webhooks/1.0",
          },
          body: payload,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (resp.ok) {
          await db.from("webhook_deliveries").update({
            status: "delivered",
            delivered_at: new Date().toISOString(),
          }).eq("id", delivery.id);

          await db.from("webhook_endpoints").update({
            failure_count: 0,
            last_success_at: new Date().toISOString(),
          }).eq("id", delivery.endpoint_id);

          processed++;
        } else if (delivery.attempts >= delivery.max_attempts) {
          await db.from("webhook_deliveries").update({
            status: "failed",
            response_status: resp.status,
          }).eq("id", delivery.id);
        } else {
          // Re-queue with next backoff
          const backoffMs = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
          const nextDelay = backoffMs[Math.min(delivery.attempts, backoffMs.length - 1)];
          await db.from("webhook_deliveries").update({
            attempts: delivery.attempts + 1,
            next_retry_at: new Date(Date.now() + nextDelay).toISOString(),
          }).eq("id", delivery.id);
        }
      } catch (fetchErr) {
        if (delivery.attempts >= delivery.max_attempts) {
          await db.from("webhook_deliveries").update({
            status: "failed",
            error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
          }).eq("id", delivery.id);
        }
      }
    }
  } catch (err) {
    log("error", "webhook_retries.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return processed;
}

/* ── Endpoint Management ─────────────────────────────────────────── */

/**
 * Register a new webhook endpoint for a workspace.
 */
export async function createWebhookEndpoint(
  workspaceId: string,
  url: string,
  events: WebhookEventType[] | ["*"],
  description?: string,
): Promise<WebhookEndpoint | null> {
  const db = getDb();
  const secret = `whsec_${crypto.randomBytes(32).toString("hex")}`;

  try {
    const { data } = await db
      .from("webhook_endpoints")
      .insert({
        workspace_id: workspaceId,
        url,
        secret,
        events,
        enabled: true,
        description: description ?? "",
        failure_count: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    log("info", "webhook_events.endpoint_created", { workspaceId, url });
    return data as unknown as WebhookEndpoint;
  } catch (err) {
    log("error", "webhook_events.create_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Send a test event to verify endpoint connectivity.
 */
export async function sendTestEvent(endpointId: string): Promise<{ success: boolean; status?: number; error?: string }> {
  const db = getDb();

  const { data: ep } = await db
    .from("webhook_endpoints")
    .select("*")
    .eq("id", endpointId)
    .maybeSingle();

  if (!ep) return { success: false, error: "Endpoint not found" };

  const endpoint = ep as unknown as WebhookEndpoint;
  const testEvent: WebhookEvent = {
    id: `evt_test_${Date.now()}`,
    type: "call.completed",
    workspace_id: endpoint.workspace_id,
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: "This is a test webhook event from Revenue Operator",
    },
  };

  try {
    const payload = JSON.stringify(testEvent);
    const signature = signPayload(payload, endpoint.secret);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const resp = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Revenue-Operator-Signature": signature,
        "X-Revenue-Operator-Event": testEvent.type,
        "X-Revenue-Operator-Event-Id": testEvent.id,
        "User-Agent": "RevenueOperator-Webhooks/1.0",
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return { success: resp.ok, status: resp.status };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
