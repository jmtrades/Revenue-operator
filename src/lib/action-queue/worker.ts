/**
 * Action Layer — Execute queued actions with policy checks.
 * Opt-out, quiet hours, rate limit, dedup. No direct send from elsewhere.
 *
 * Guarantees:
 * - Same action_command (dedup_key) is never sent twice: we check for existing
 *   outbound with same dedup_key before send (crash-after-send-before-ack scenario).
 * - With actionCommandId: delivery-assurance path — complete only when provider confirms;
 *   retries via action_attempts; DLQ + handoff on max retries.
 */

import { getDb } from "@/lib/db/queries";
import { sendOutbound } from "@/lib/delivery/provider";
import { mergeSettings, isWithinBusinessHours } from "@/lib/autopilot";
import type { ActionCommand } from "./types";

/** When inner skips send because an outbound already exists for this dedup_key, it marks processed and returns this. */
const SKIPPED_DUPLICATE_SEND = { alreadyMarkedProcessed: true } as const;
/** When send succeeded but delivery not yet confirmed; do not set action_command.processed_at. */
const DELIVERY_PENDING = { skipMarkProcessed: true } as const;

export async function runActionJob(
  command: ActionCommand,
  actionCommandId?: string
): Promise<void> {
  if (actionCommandId) {
    const { isActionCommandProcessed, markActionCommandProcessed, scheduleActionRetry } = await import("./persist");
    if (await isActionCommandProcessed(actionCommandId)) return;
    try {
      const result = await runActionJobInner(command, actionCommandId);
      if (result?.skipMarkProcessed) return; // delivery webhook will mark processed
      if (!result?.alreadyMarkedProcessed) await markActionCommandProcessed(actionCommandId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const { shouldDLQ } = await scheduleActionRetry(actionCommandId, errMsg);
      if (shouldDLQ) {
        try {
          const { toDLQ } = await import("@/lib/queue");
          toDLQ(`action:${actionCommandId}`, errMsg);
        } catch {
          // Non-blocking
        }
      }
      throw err;
    }
    return;
  }
  await runActionJobInner(command);
}

async function runActionJobInner(
  command: ActionCommand,
  actionCommandId?: string
): Promise<{ alreadyMarkedProcessed?: boolean; skipMarkProcessed?: boolean } | void> {
  const db = getDb();
  const { workspace_id, lead_id, payload, dedup_key } = command;

  const { data: lead } = await db
    .from("leads")
    .select("id, opt_out, email, phone")
    .eq("id", lead_id)
    .eq("workspace_id", workspace_id)
    .maybeSingle();
  if (!lead) throw new Error("Lead not found");
  if ((lead as { opt_out?: boolean }).opt_out) return;

  const { data: settingsRow } = await db.from("settings").select("*").eq("workspace_id", workspace_id).maybeSingle();
  const settings = mergeSettings(settingsRow as Parameters<typeof mergeSettings>[0]);
  if (!isWithinBusinessHours(settings)) return;

  if (command.type === "SendMessage") {
    const p = payload as { conversation_id: string; channel: string; content: string; action_type?: string };
    const { data: conv } = await db
      .from("conversations")
      .select("id")
      .eq("id", p.conversation_id)
      .maybeSingle();
    if (!conv) return;

    const { checkConfidenceGate } = await import("@/lib/confidence-engine/gate");
    const actionType = p.action_type ?? "message";
    const gate = await checkConfidenceGate(workspace_id, actionType, p.content, p.conversation_id);
    if (!gate.proceed) {
      if (gate.markProcessed && actionCommandId) {
        const { markActionCommandProcessed } = await import("./persist");
        await markActionCommandProcessed(actionCommandId);
      }
      return SKIPPED_DUPLICATE_SEND;
    }

    const { isOptedOut } = await import("@/lib/lead-opt-out");
    if (await isOptedOut(workspace_id, `lead:${lead_id}`)) {
      if (actionCommandId) {
        const { markActionCommandProcessed } = await import("./persist");
        await markActionCommandProcessed(actionCommandId);
      }
      return;
    }

    // Delivery-assurance path: when we have actionCommandId, use action_attempts; complete only on provider confirmation.
    if (actionCommandId) {
      const {
        hasDeliveredOrAcknowledgedAttempt,
        getNextAttemptNumber,
        createAttempt,
        markAttemptSent,
        markAttemptFailed,
        MAX_ATTEMPTS,
      } = await import("@/lib/delivery-assurance/action-attempts");
      const { markActionCommandProcessed } = await import("./persist");
      const { toFailedJobAndEscalate } = await import("@/lib/delivery-assurance/dlq-handoff");

      if (await hasDeliveredOrAcknowledgedAttempt(actionCommandId)) {
        await markActionCommandProcessed(actionCommandId);
        return SKIPPED_DUPLICATE_SEND;
      }
      const attemptNumber = await getNextAttemptNumber(actionCommandId);
      if (attemptNumber === 0) {
        await toFailedJobAndEscalate({
          workspaceId: workspace_id,
          leadId: lead_id,
          jobType: "SendMessage",
          payload: p as unknown as Record<string, unknown>,
          errorMessage: "Max delivery attempts exceeded",
          stage: "action",
          attemptCount: MAX_ATTEMPTS,
        });
        await markActionCommandProcessed(actionCommandId);
        return SKIPPED_DUPLICATE_SEND;
      }

      const { data: om } = await db
        .from("outbound_messages")
        .insert({
          workspace_id,
          lead_id,
          conversation_id: p.conversation_id,
          content: p.content,
          channel: p.channel,
          status: "queued",
          metadata: { dedup_key, operator_id: command.operator_id },
        })
        .select("id")
        .maybeSingle();
      if (!om) return;
      const omId = (om as { id: string }).id;
      const attemptId = await createAttempt(actionCommandId, attemptNumber, omId);
      const to = { email: (lead as { email?: string }).email, phone: (lead as { phone?: string }).phone };
      const result = await sendOutbound(
        omId,
        workspace_id,
        lead_id,
        p.conversation_id,
        p.channel,
        p.content,
        to,
        (p as { email_subject?: string }).email_subject
      );

      if (result.status === "failed") {
        const errMsg = result.error ?? "Send failed";
        const { shouldDLQ } = await markAttemptFailed(attemptId, errMsg);
        if (shouldDLQ) {
          await toFailedJobAndEscalate({
            workspaceId: workspace_id,
            leadId: lead_id,
            jobType: "SendMessage",
            payload: p as unknown as Record<string, unknown>,
            errorMessage: errMsg,
            stage: "action",
            attemptCount: MAX_ATTEMPTS,
          });
          await markActionCommandProcessed(actionCommandId);
        }
        throw new Error(errMsg);
      }

      if (result.externalId) await markAttemptSent(attemptId, result.externalId);
      const actionType = (p as { action_type?: string }).action_type;
      if (actionType) {
        const { removePreview, markExecutedActionType } = await import("@/lib/adoption-acceleration/previews");
        await removePreview(workspace_id, actionType).catch(() => {});
        await markExecutedActionType(workspace_id, actionType).catch(() => {});
      }
      const { appendNarrative } = await import("@/lib/confidence-engine");
      await appendNarrative(workspace_id, "action_executed", "An outbound action was sent.").catch(() => {});
      const delaySeconds = (p as { delay_seconds?: number }).delay_seconds;
      if (delaySeconds != null) {
        const { recordResponseDelay } = await import("@/lib/human-presence");
        await recordResponseDelay(lead_id, delaySeconds);
      }
      const { createCommitment } = await import("@/lib/commitment-recovery");
      createCommitment(workspace_id, "conversation", p.conversation_id, new Date(Date.now() + 24 * 60 * 60 * 1000)).catch(() => {});
      const { updateOnBusinessMessage } = await import("@/lib/opportunity-recovery");
      updateOnBusinessMessage(workspace_id, p.conversation_id).catch(() => {});
      return DELIVERY_PENDING;
    }

    // Legacy path (no actionCommandId): mark processed on send.
    const { data: outboundsInConv } = await db
      .from("outbound_messages")
      .select("id, metadata")
      .eq("workspace_id", workspace_id)
      .eq("lead_id", lead_id)
      .eq("conversation_id", p.conversation_id)
      .limit(50);
    const existingByDedup = (outboundsInConv ?? []).find(
      (row) => (row as { metadata?: { dedup_key?: string } }).metadata?.dedup_key === dedup_key
    );
    if (existingByDedup && actionCommandId) {
      const { markActionCommandProcessed } = await import("./persist");
      await markActionCommandProcessed(actionCommandId);
      return SKIPPED_DUPLICATE_SEND;
    }

    const { data: recent } = await db
      .from("outbound_messages")
      .select("id")
      .eq("lead_id", lead_id)
      .eq("conversation_id", p.conversation_id)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(1)
      .maybeSingle();
    if (recent) return;

    const { data: om } = await db
      .from("outbound_messages")
      .insert({
        workspace_id,
        lead_id,
        conversation_id: p.conversation_id,
        content: p.content,
        channel: p.channel,
        status: "queued",
        metadata: { dedup_key, operator_id: command.operator_id },
      })
      .select("id")
      .maybeSingle();
    if (om) {
      const to = { email: (lead as { email?: string }).email, phone: (lead as { phone?: string }).phone };
      const result = await sendOutbound(
        (om as { id: string }).id,
        workspace_id,
        lead_id,
        p.conversation_id,
        p.channel,
        p.content,
        to,
        (p as { email_subject?: string }).email_subject
      );
      if (result.status === "failed") throw new Error(result.error ?? "Send failed");
      const actionType = (p as { action_type?: string }).action_type;
      if (actionType) {
        const { removePreview, markExecutedActionType } = await import("@/lib/adoption-acceleration/previews");
        await removePreview(workspace_id, actionType).catch(() => {});
        await markExecutedActionType(workspace_id, actionType).catch(() => {});
      }
      const { appendNarrative } = await import("@/lib/confidence-engine");
      await appendNarrative(workspace_id, "action_executed", "An outbound action was sent.").catch(() => {});
      const delaySeconds = (p as { delay_seconds?: number }).delay_seconds;
      if (delaySeconds != null) {
        const { recordResponseDelay } = await import("@/lib/human-presence");
        await recordResponseDelay(lead_id, delaySeconds);
      }
      const { createCommitment } = await import("@/lib/commitment-recovery");
      createCommitment(workspace_id, "conversation", p.conversation_id, new Date(Date.now() + 24 * 60 * 60 * 1000)).catch(() => {});
      const { updateOnBusinessMessage } = await import("@/lib/opportunity-recovery");
      updateOnBusinessMessage(workspace_id, p.conversation_id).catch(() => {});
    }
    return;
  }

  if (command.type === "ScheduleFollowup") {
    const p = payload as { next_action_at: string; next_action_type: string };
    const { setLeadPlan } = await import("@/lib/plans/lead-plan");
    await setLeadPlan(workspace_id, lead_id, {
      next_action_type: p.next_action_type,
      next_action_at: p.next_action_at,
    });
    return;
  }

  if (command.type === "RecoverNoShow" || command.type === "ReactivateLead") {
    await (await import("@/lib/queue")).enqueueDecision(lead_id, workspace_id);
    return;
  }

  if (command.type === "SendReminder") {
    const p = payload as { conversation_id: string; channel: string; content: string };
    // Same guard as SendMessage: avoid double send if outbound already exists for this dedup_key.
    const { data: reminderOutbounds } = await db
      .from("outbound_messages")
      .select("id, metadata")
      .eq("workspace_id", workspace_id)
      .eq("lead_id", lead_id)
      .eq("conversation_id", p.conversation_id)
      .limit(50);
    const existingReminderByDedup = (reminderOutbounds ?? []).find(
      (row) => (row as { metadata?: { dedup_key?: string } }).metadata?.dedup_key === dedup_key
    );
    if (existingReminderByDedup && actionCommandId) {
      const { markActionCommandProcessed } = await import("./persist");
      await markActionCommandProcessed(actionCommandId);
      return SKIPPED_DUPLICATE_SEND;
    }
    const { data: om } = await db
      .from("outbound_messages")
      .insert({
        workspace_id,
        lead_id,
        conversation_id: p.conversation_id,
        content: p.content,
        channel: p.channel,
        status: "queued",
        metadata: { dedup_key, reminder: true },
      })
      .select("id")
      .maybeSingle();
    if (om) {
      const to = { email: (lead as { email?: string }).email, phone: (lead as { phone?: string }).phone };
      const result = await sendOutbound(
        (om as { id: string }).id,
        workspace_id,
        lead_id,
        p.conversation_id,
        p.channel,
        p.content,
        to,
        (p as { email_subject?: string }).email_subject
      );
      if (result.status === "failed") throw new Error(result.error ?? "Send failed");
    }
  }
}
