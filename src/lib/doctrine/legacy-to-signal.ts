/**
 * Convert legacy raw_webhook payload to canonical signal path.
 * Used when DOCTRINE_ENFORCED=1 and a process_webhook job is dequeued.
 */

import { getDb } from "@/lib/db/queries";
import { ingestInboundAsSignal } from "@/lib/signals/ingest-inbound";
import { enqueue } from "@/lib/queue";

export interface RawWebhookPayloadLike {
  workspace_id: string;
  channel: string;
  external_lead_id: string;
  thread_id?: string;
  email?: string;
  phone?: string;
  name?: string;
  company?: string;
  message: string;
  external_message_id?: string;
}

/**
 * Load raw_webhook by id, normalize to InboundInput, call ingestInboundAsSignal, enqueue process_signal.
 * Marks raw as processed. Returns { signalId, enqueued } or throws.
 */
export async function convertLegacyWebhookToSignalAndEnqueue(webhookId: string): Promise<{ signalId: string; enqueued: boolean }> {
  const db = getDb();
  const { data: raw, error } = await db
    .from("raw_webhook_events")
    .select("id, payload, processed")
    .eq("id", webhookId)
    .single();

  if (error || !raw) throw new Error(`Raw webhook not found: ${webhookId}`);
  if ((raw as { processed?: boolean }).processed) {
    return { signalId: "", enqueued: false };
  }

  const body = (raw as { payload?: RawWebhookPayloadLike }).payload;
  if (!body?.workspace_id || !body?.channel || !body?.external_lead_id || !body?.message) {
    throw new Error("Invalid raw payload: missing workspace_id, channel, external_lead_id, or message");
  }

  const { signalId, inserted } = await ingestInboundAsSignal({
    workspace_id: body.workspace_id,
    channel: body.channel,
    external_lead_id: body.external_lead_id,
    thread_id: body.thread_id ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    name: body.name ?? null,
    company: body.company ?? null,
    message: body.message,
    external_message_id: body.external_message_id ?? null,
  });

  await db
    .from("raw_webhook_events")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("id", webhookId);

  if (inserted && signalId) {
    await enqueue({ type: "process_signal", signalId });
    return { signalId, enqueued: true };
  }
  return { signalId: "", enqueued: false };
}
