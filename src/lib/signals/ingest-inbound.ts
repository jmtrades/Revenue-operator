/**
 * Connector path: upsert lead + conversation + message, then insert canonical signal.
 * Only normalization; no state mutation, no enqueueDecision. Consumer runs state + operators.
 */

import { getDb } from "@/lib/db/queries";
import { insertSignal, type InsertSignalResult } from "./store";
import { idempotencyKey } from "./types";

export interface InboundInput {
  workspace_id: string;
  channel: string;
  external_lead_id: string;
  thread_id?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  company?: string | null;
  message: string;
  external_message_id?: string | null;
}

/**
 * Upsert lead and conversation, insert user message, insert InboundMessageReceived signal.
 * Returns { signalId, inserted }. If duplicate idempotency_key, inserted is false.
 */
export async function ingestInboundAsSignal(input: InboundInput): Promise<{ signalId: string; inserted: boolean }> {
  const db = getDb();
  const {
    workspace_id,
    channel,
    external_lead_id,
    thread_id,
    email,
    phone,
    name,
    company,
    message,
    external_message_id,
  } = input;

  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspace_id).single();
  if (!ws) throw new Error(`Workspace ${workspace_id} not found`);

  const { data: lead, error: leadError } = await db
    .from("leads")
    .upsert(
      {
        workspace_id,
        external_id: external_lead_id,
        channel,
        email: email ?? null,
        phone: phone ?? null,
        name: name ?? null,
        company: company ?? null,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,external_id" }
    )
    .select("id")
    .single();
  if (leadError || !lead) throw new Error(`Lead upsert failed: ${leadError?.message ?? "unknown"}`);
  const leadId = (lead as { id: string }).id;

  const { data: conversation, error: convError } = await db
    .from("conversations")
    .upsert(
      {
        lead_id: leadId,
        channel,
        external_thread_id: thread_id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id,channel,external_thread_id" }
    )
    .select("id")
    .single();
  if (convError || !conversation) throw new Error(`Conversation upsert failed: ${convError?.message ?? "unknown"}`);
  const conversationId = (conversation as { id: string }).id;

  let messageId = "";
  if (external_message_id) {
    const { data: existingMsg } = await db
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("external_id", external_message_id)
      .maybeSingle();
    if (existingMsg) {
      messageId = (existingMsg as { id: string }).id;
    }
    if (!messageId) {
      const { data: inserted, error } = await db
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content: message,
          external_id: external_message_id,
        })
        .select("id")
        .single();
      if (error?.code === "23505") {
        const { data: row } = await db
          .from("messages")
          .select("id")
          .eq("conversation_id", conversationId)
          .eq("external_id", external_message_id)
          .single();
        messageId = (row as { id: string })?.id ?? "";
      } else if (inserted) {
        messageId = (inserted as { id: string }).id;
      }
    }
  } else {
    const { data: insertedMessage } = await db
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
        external_id: null,
      })
      .select("id")
      .single();
    messageId = (insertedMessage as { id: string } | null)?.id ?? "";
  }

  const occurredAt = new Date().toISOString();
  const key = idempotencyKey("InboundMessageReceived", workspace_id, leadId, external_message_id ?? messageId ?? crypto.randomUUID());
  const result: InsertSignalResult = await insertSignal({
    workspace_id,
    lead_id: leadId,
    signal_type: "InboundMessageReceived",
    idempotency_key: key,
    payload: {
      conversation_id: conversationId,
      message_id: messageId,
      content: message,
      channel,
      external_id: external_message_id ?? null,
    },
    occurred_at: occurredAt,
  });

  if (!result.inserted) {
    return { signalId: "", inserted: false };
  }

  const { messageIndicatesOptOut, recordOptOut } = await import("@/lib/lead-opt-out");
  if (messageIndicatesOptOut(message)) {
    await recordOptOut(workspace_id, `lead:${leadId}`);
  }

  return { signalId: (result as { id: string }).id, inserted: true };
}
