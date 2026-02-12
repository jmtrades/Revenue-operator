/**
 * processWebhookJob: normalize -> upsert lead/conv/msg -> emit event -> enqueue decisionJob
 */

import { getDb } from "@/lib/db/queries";
import { processEvent } from "@/lib/event-engine";
import { enqueue, enqueueDecision } from "@/lib/queue";
import { redact } from "@/lib/redact";
import { isOptOut, mergeSettings } from "@/lib/autopilot";
import { incrementMetric, METRIC_KEYS } from "@/lib/observability/metrics";
import { emitOutboundEvent } from "@/lib/outbound-events";
import { recordCommitmentSignal } from "@/lib/commitment";
import { recordLeadReaction } from "@/lib/lead-memory";

export interface RawWebhookPayload {
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

export async function processWebhookJob(webhookId: string): Promise<{ decisionLeadId: string | null; decisionWorkspaceId: string | null } | void> {
  const db = getDb();
  const { data: raw, error: fetchErr } = await db
    .from("raw_webhook_events")
    .select("*")
    .eq("id", webhookId)
    .single();

  if (fetchErr || !raw || raw.processed) {
    if (fetchErr) console.error("[processWebhook] fetch error", redact({ webhookId, err: String(fetchErr) }));
    return undefined;
  }

  const body = raw.payload as RawWebhookPayload;
  const { workspace_id, channel, external_lead_id, thread_id, email, phone, name, company, message, external_message_id } = body;

  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspace_id).single();
  if (!ws) {
    throw new Error(`Workspace ${workspace_id} not found`);
  }

  try {
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
      .select()
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead upsert failed: ${leadError?.message ?? "unknown"}`);
    }

    const { data: conversation, error: convError } = await db
      .from("conversations")
      .upsert(
        {
          lead_id: lead.id,
          channel,
          external_thread_id: thread_id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lead_id,channel,external_thread_id" }
      )
      .select()
      .single();

    if (convError || !conversation) {
      throw new Error(`Conversation upsert failed: ${convError?.message ?? "unknown"}`);
    }

    await db.from("messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: message,
      external_id: external_message_id ?? null,
    });

    const { stopSequence } = await import("@/lib/sequences/engine");
    const { cancelLeadPlan } = await import("@/lib/plans/lead-plan");
    await stopSequence(workspace_id, lead.id, "user_reply").catch(() => {});
    await cancelLeadPlan(workspace_id, lead.id, "user_reply").catch(() => {});

    const { data: lastAssistant } = await db
      .from("messages")
      .select("metadata")
      .eq("conversation_id", conversation.id)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const lastAction = (lastAssistant as { metadata?: { action?: string } })?.metadata?.action ?? "message";
    const outcome = message.length > 50 ? message.slice(0, 50) + "…" : message;
    recordLeadReaction(lead.id, workspace_id, lastAction, outcome).catch(() => {});

    const msgLower = message.toLowerCase();
    if (msgLower.includes("confirmed") || msgLower.includes("yes") || msgLower.includes("i'll be there") || msgLower.includes("see you")) {
      recordCommitmentSignal(lead.id, "confirmation_reply").catch(() => {});
    }
    if (msgLower.includes("reschedule") || msgLower.includes("cancel") || msgLower.includes("can't make it")) {
      recordCommitmentSignal(lead.id, "reschedule_resistance").catch(() => {});
    }

    const { detectDisinterest, setLowPressureMode } = await import("@/lib/human-safety/disinterest-detector");
    const disinterest = detectDisinterest(message);
    if (disinterest.detected && disinterest.lowPressureMode) {
      await setLowPressureMode(workspace_id, lead.id, true);
    }

    const { data: settingsRow } = await db.from("settings").select("*").eq("workspace_id", workspace_id).single();
    const settings = mergeSettings(settingsRow);
    const optOut = isOptOut(message, settings);
    if (optOut) {
      await db.from("leads").update({ opt_out: true, updated_at: new Date().toISOString() }).eq("id", lead.id);
      await incrementMetric(workspace_id, METRIC_KEYS.OPT_OUT);
      await db.from("messages").insert({
        conversation_id: conversation.id,
        role: "assistant",
        content: "You've been unsubscribed. You won't receive further messages.",
        metadata: { type: "compliance_confirmation" },
      });
      await db
        .from("raw_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", webhookId);
      return { decisionLeadId: null, decisionWorkspaceId: null };
    }

    const currentState = ((lead as { state?: string }).state ?? "NEW") as import("@/lib/types").LeadState;

    const decision = processEvent({
      workspaceId: workspace_id,
      leadId: lead.id,
      eventType: "message_received",
      entityType: "lead",
      entityId: lead.id,
      payload: { message, channel },
      triggerSource: "webhook",
      currentState: currentState as import("@/lib/types").LeadState,
    });

    const { data: eventRow } = await db.from("events").insert({
      workspace_id,
      event_type: "message_received",
      entity_type: "lead",
      entity_id: lead.id,
      payload: { message, decision },
      trigger_source: "webhook",
    }).select("id").single();

    await db.from("leads").update({
      state: decision.newState,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    }).eq("id", lead.id);

    if (decision.transitionOccurred && decision.newState !== currentState) {
      if (decision.newState === "QUALIFIED") {
        emitOutboundEvent(workspace_id, "lead_qualified", { lead_id: lead.id, from_state: currentState }, lead.id).catch(() => {});
      }
      if (decision.newState === "REACTIVATE") {
        emitOutboundEvent(workspace_id, "lead_reactivated", { lead_id: lead.id, from_state: currentState }, lead.id).catch(() => {});
      }
    }

    await db.from("automation_states").upsert({
      lead_id: lead.id,
      state: decision.newState,
      allowed_actions: decision.allowedActions,
      last_event_type: "message_received",
      last_event_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "lead_id" });

    await db
      .from("raw_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", webhookId);

    if (decision.shouldGenerateResponse && decision.allowedActions.length > 0) {
      await enqueueDecision(lead.id, workspace_id, (eventRow as { id: string })?.id ?? lead.id);
      return { decisionLeadId: lead.id, decisionWorkspaceId: workspace_id };
    }
    return { decisionLeadId: null, decisionWorkspaceId: null };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db
      .from("raw_webhook_events")
      .update({
        error: errMsg,
        retry_count: (raw.retry_count ?? 0) + 1,
      })
      .eq("id", webhookId);
    throw err;
  }
}
