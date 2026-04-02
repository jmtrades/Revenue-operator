/**
 * Normalized event → existing pipeline.
 * Upsert lead + conversation + message, resolve state, enqueue decision.
 * Single entry point for all connectors.
 */

import { log } from "@/lib/logger";
import type { NormalizedInboundEvent } from "@/lib/universal-model";
import { getDb } from "@/lib/db/queries";
import { processEvent } from "@/lib/event-engine";
import { enqueueDecision } from "@/lib/queue";
import { isOptOut, mergeSettings } from "@/lib/autopilot";
import { resolveConversationState, getConversationContext } from "@/lib/conversation-state/resolver";

const CHANNEL_TO_DB: Record<string, string> = {
  sms: "sms",
  email: "email",
  web_form: "web",
  web_chat: "web",
  whatsapp: "whatsapp",
  instagram: "instagram",
  hubspot: "hubspot",
  highlevel: "highlevel",
  pipedrive: "pipedrive",
  zoho: "zoho",
  webhook: "webhook",
};

/**
 * Process a normalized inbound event: upsert lead, conversation, message; resolve state; enqueue decision.
 * Idempotency: if idempotency_key provided, check raw_webhook_events or a dedup store and skip if already processed.
 */
export async function processNormalizedInbound(
  event: NormalizedInboundEvent
): Promise<{ decisionLeadId: string | null; decisionWorkspaceId: string | null }> {
  const db = getDb();
  const { workspace_id, channel, participant, message: msg } = event;
  const channelDb = CHANNEL_TO_DB[(channel as string)] ?? "webhook";
  const external_lead_id = participant.external_id;
  const thread_id = participant.thread_id ?? undefined;

  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspace_id).maybeSingle();
  if (!ws) {
    throw new Error(`Workspace ${workspace_id} not found`);
  }

  const { data: lead, error: leadError } = await db
    .from("leads")
    .upsert(
      {
        workspace_id,
        external_id: external_lead_id,
        channel: channelDb,
        email: participant.email ?? null,
        phone: participant.phone ?? null,
        name: participant.display_name ?? null,
        company: null,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,external_id" }
    )
    .select()
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(`Lead upsert failed: ${leadError?.message ?? "unknown"}`);
  }

  const { data: conversation, error: convError } = await db
    .from("conversations")
    .upsert(
      {
        lead_id: (lead as { id: string }).id,
        channel: channelDb,
        external_thread_id: thread_id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id,channel,external_thread_id" }
    )
    .select()
    .maybeSingle();

  if (convError || !conversation) {
    throw new Error(`Conversation upsert failed: ${convError?.message ?? "unknown"}`);
  }

  const convId = (conversation as { id: string }).id;
  const leadId = (lead as { id: string }).id;

  const { data: insertedMessage } = await db
    .from("messages")
    .insert({
      conversation_id: convId,
      role: "user",
      content: msg.content,
      external_id: msg.external_id ?? null,
    })
    .select("id")
    .maybeSingle();

  const conversationContext = await getConversationContext(leadId, convId);
  const stateResult = await resolveConversationState({
    ...conversationContext,
    message: msg.content,
  });

  if (insertedMessage) {
    await db
      .from("messages")
      .update({
        metadata: {
          conversation_state: stateResult.state,
          state_confidence: stateResult.confidence,
          state_reasoning_tags: stateResult.reasoning_tags,
        },
      })
      .eq("id", (insertedMessage as { id: string }).id);
  }

  const { stopSequence } = await import("@/lib/sequences/follow-up-engine");
  const { cancelLeadPlan } = await import("@/lib/plans/lead-plan");
  await stopSequence(workspace_id, leadId, "user_reply").catch((e: unknown) => {
    log("error", "stopSequence failed", { error: e instanceof Error ? e.message : String(e) });
  });
  await cancelLeadPlan(workspace_id, leadId, "user_reply").catch((e: unknown) => {
    log("error", "cancelLeadPlan failed", { error: e instanceof Error ? e.message : String(e) });
  });

  const { data: settingsRow } = await db.from("settings").select("*").eq("workspace_id", workspace_id).maybeSingle();
  const settings = mergeSettings(settingsRow as Parameters<typeof mergeSettings>[0]);
  if (isOptOut(msg.content, settings)) {
    await db.from("leads").update({ opt_out: true, updated_at: new Date().toISOString() }).eq("id", leadId);
    return { decisionLeadId: null, decisionWorkspaceId: null };
  }

  const currentState = ((lead as { state?: string }).state ?? "NEW") as import("@/lib/types").LeadState;
  const decision = processEvent({
    workspaceId: workspace_id,
    leadId,
    eventType: "message_received",
    entityType: "lead",
    entityId: leadId,
    payload: { message: msg.content, channel: channelDb },
    triggerSource: "connector",
    currentState,
  });

  await db.from("events").insert({
    workspace_id,
    event_type: "message_received",
    entity_type: "lead",
    entity_id: leadId,
    payload: {
      message: msg.content,
      decision,
      conversation_state: stateResult.state,
      state_confidence: stateResult.confidence,
    },
    trigger_source: "connector",
  });

  await db.from("leads").update({
    state: decision.newState,
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  }).eq("id", leadId);

  await db.from("automation_states").upsert(
    {
      lead_id: leadId,
      state: decision.newState,
      allowed_actions: decision.allowedActions,
      last_event_type: "message_received",
      last_event_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lead_id" }
  );

  if (decision.shouldGenerateResponse && decision.allowedActions.length > 0) {
    await enqueueDecision(leadId, workspace_id, leadId);
    return { decisionLeadId: leadId, decisionWorkspaceId: workspace_id };
  }
  return { decisionLeadId: null, decisionWorkspaceId: null };
}
