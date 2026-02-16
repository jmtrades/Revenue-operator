/**
 * Map connector inbox events to canonical signals. No engine-to-engine calls.
 * Called from cron only. When identity cannot be resolved, record exposure for Responsibility.
 */

import { createHash } from "crypto";
import { getDb } from "@/lib/db/queries";
import { emitDiscoveredSignal } from "@/lib/reconciliation/emit";
import { recordObservedRiskEvent } from "@/lib/installation";
import { insertSignal } from "@/lib/signals/store";
import { enqueue } from "@/lib/queue";
import type { CanonicalSignalType } from "@/lib/signals/types";

/** Stable hash of payload for external_ref; no PII stored in ref. */
function payloadHash(eventId: string, kind: string, data: Record<string, unknown>): string {
  const keys = Object.keys(data).sort();
  const stub: Record<string, unknown> = {};
  for (const k of keys) stub[k] = typeof data[k] === "object" ? "[object]" : "[value]";
  const str = `${eventId}:${kind}:${JSON.stringify(stub)}`;
  return createHash("sha256").update(str, "utf8").digest("hex").slice(0, 32);
}

export async function recordUnresolvedInboxExposure(
  workspaceId: string,
  event: { id: string; kind: string; data: Record<string, unknown> }
): Promise<void> {
  const db = getDb();
  const external_ref = payloadHash(event.id, event.kind, event.data ?? {});
  const now = new Date().toISOString();
  await db.from("incoming_entries").upsert(
    { workspace_id: workspaceId, external_ref, state: "exposure", last_event_at: now },
    { onConflict: "workspace_id,external_ref" }
  );
}

const SOURCE = "connector_inbox";
const SCHEMA_VERSION = 1;

function withMeta(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    source: SOURCE,
    schema_version: SCHEMA_VERSION,
    discovered_at: new Date().toISOString(),
  };
}

function idempotencyKey(kind: string, eventId: string, payload: Record<string, unknown>): string {
  const ext = (payload.message_id ?? payload.event_id ?? payload.booking_id ?? eventId) as string;
  return `connector_inbox:${kind}:${String(ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64)}`;
}

async function resolveLeadFromConversation(workspaceId: string, conversationId: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("conversations")
    .select("lead_id")
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (data as { lead_id?: string } | null)?.lead_id ?? null;
}

async function resolveLeadFromBooking(workspaceId: string, bookingId: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("bookings")
    .select("lead_id")
    .eq("id", bookingId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (data as { lead_id?: string } | null)?.lead_id ?? null;
}

export async function mapInboxEventToSignal(
  event: { id: string; workspace_id: string; kind: string; data: Record<string, unknown>; occurred_at: string }
): Promise<{ mapped: boolean }> {
  const { workspace_id: workspaceId, kind, data, occurred_at: occurredAt } = event;
  const d = data ?? {};

  if (kind === "email.inbound") {
    let leadId: string | null = (d.lead_id as string) ?? null;
    if (!leadId && d.conversation_id) {
      leadId = await resolveLeadFromConversation(workspaceId, d.conversation_id as string);
    }
    if (!leadId) {
      await recordUnresolvedInboxExposure(workspaceId, { id: event.id, kind, data: d });
      return { mapped: false };
    }
    const payload = withMeta({
      provider: "generic",
      provider_message_id: d.message_id ?? d.id ?? event.id,
      from: d.from,
      to: d.to,
      body: d.body ?? d.content,
      received_at: d.received_at ?? occurredAt,
    });
    await emitDiscoveredSignal(workspaceId, leadId, "InboundMessageDiscovered", payload);
    return { mapped: true };
  }

  if (kind === "email.outbound") {
    let leadId: string | null = (d.lead_id as string) ?? null;
    if (!leadId && d.conversation_id) {
      leadId = await resolveLeadFromConversation(workspaceId, d.conversation_id as string);
    }
    if (!leadId) {
      await recordUnresolvedInboxExposure(workspaceId, { id: event.id, kind, data: d });
      return { mapped: false };
    }
    const payload = withMeta({
      message_id: d.message_id ?? d.id,
      channel: "email",
      status: "sent",
      sent_at: d.sent_at ?? occurredAt,
    });
    const idempotency_key = idempotencyKey(kind, event.id, d);
    const result = await insertSignal({
      workspace_id: workspaceId,
      lead_id: leadId,
      signal_type: "OutboundMessageSent" as CanonicalSignalType,
      idempotency_key,
      payload,
      occurred_at: (d.sent_at as string) ?? occurredAt,
    });
    if (result.inserted && result.id) {
      await enqueue({ type: "process_signal", signalId: result.id });
    }
    return { mapped: true };
  }

  if (kind === "calendar.event_created") {
    let leadId: string | null = (d.lead_id as string) ?? null;
    if (!leadId && d.booking_id) {
      leadId = await resolveLeadFromBooking(workspaceId, d.booking_id as string);
    }
    if (leadId) {
      const payload = withMeta({
        booking_id: d.booking_id,
        start_at: d.start_at ?? occurredAt,
        end_at: d.end_at,
        occurred_at: occurredAt,
      });
      const idempotency_key = idempotencyKey(kind, event.id, d);
      const result = await insertSignal({
        workspace_id: workspaceId,
        lead_id: leadId,
        signal_type: "BookingCreated" as CanonicalSignalType,
        idempotency_key,
        payload,
        occurred_at: occurredAt,
      });
      if (result.inserted && result.id) {
        await enqueue({ type: "process_signal", signalId: result.id });
      }
      return { mapped: true };
    }
    await recordObservedRiskEvent(
      workspaceId,
      "missed_confirmation",
      "booking",
      (d.booking_id as string) ?? event.id
    );
    return { mapped: true };
  }

  if (kind === "calendar.no_show_signal") {
    let leadId: string | null = (d.lead_id as string) ?? null;
    if (!leadId && d.booking_id) {
      leadId = await resolveLeadFromBooking(workspaceId, d.booking_id as string);
    }
    if (leadId) {
      const payload = withMeta({
        provider: "calendar",
        booking_id: d.booking_id,
        external_event_id: d.event_id,
        missed_at: d.missed_at ?? occurredAt,
      });
      await emitDiscoveredSignal(workspaceId, leadId, "AppointmentMissed", payload);
      return { mapped: true };
    }
    await recordObservedRiskEvent(
      workspaceId,
      "missed_confirmation",
      "booking",
      (d.booking_id as string) ?? event.id
    );
    return { mapped: true };
  }

  await recordUnresolvedInboxExposure(workspaceId, { id: event.id, kind, data: d });
  return { mapped: false };
}
