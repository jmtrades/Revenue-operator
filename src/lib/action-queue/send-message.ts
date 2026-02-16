/**
 * Decision layer MUST use this to "send" — never call delivery/provider directly.
 * Enqueues SendMessage; action worker performs the actual send.
 * Human presence: optional send_at → persist now, enqueue only when due.
 * Rate guard: max 20 sends per workspace per 10 min; over limit → escalation + outbound_throttled, no send.
 */

import { enqueue } from "@/lib/queue";
import { persistActionCommand } from "./persist";
import type { ActionCommand } from "./types";
import { checkOutboundRateLimit } from "@/lib/runtime/outbound-guard";

const SEND_AT_ENQUEUE_THRESHOLD_MS = 2 * 60 * 1000; // enqueue immediately if send_at within 2 min

/**
 * Enqueue a send-message action. Only the action worker may call sendOutbound.
 * Dedup key prevents duplicate sends for the same logical reply.
 * If options.send_at is in the future (beyond threshold), command is persisted only; cron will enqueue when due.
 */
export async function enqueueSendMessage(
  workspaceId: string,
  leadId: string,
  conversationId: string,
  channel: string,
  content: string,
  dedupKey: string,
  options?: { send_at?: Date; delay_seconds?: number; action_type?: string }
): Promise<string> {
  const { isAutomationAllowed } = await import("@/lib/adoption-acceleration/installation-state");
  if (!(await isAutomationAllowed(workspaceId))) return "";

  const { allowed } = await checkOutboundRateLimit(workspaceId);
  if (!allowed) {
    const { log } = await import("@/lib/runtime/log");
    log("outbound_throttled", { workspace_id: workspaceId });
    const { logEscalation } = await import("@/lib/escalation");
    await logEscalation(
      workspaceId,
      leadId,
      "delivery_failed",
      "Outbound throttled",
      "Message not sent: rate limit exceeded."
    );
    const db = (await import("@/lib/db/queries")).getDb();
    await db.from("protocol_events").insert({
      external_ref: `throttle:${workspaceId}:${Date.now()}`,
      workspace_id: workspaceId,
      event_type: "outbound_throttled",
      payload: {},
    });
    return "";
  }

  const sendAt = options?.send_at;
  const payload = {
    conversation_id: conversationId,
    channel,
    content,
    ...(sendAt && { send_at: sendAt.toISOString() }),
    ...(options?.delay_seconds != null && { delay_seconds: options.delay_seconds }),
    ...(options?.action_type && { action_type: options.action_type }),
  };
  const command: ActionCommand = {
    type: "SendMessage",
    workspace_id: workspaceId,
    lead_id: leadId,
    payload,
    dedup_key: dedupKey,
  };

  const { id: actionCommandId, isNew } = await persistActionCommand(command);
  if (!isNew) return "";

  const dueNow = !sendAt || sendAt.getTime() <= Date.now() + SEND_AT_ENQUEUE_THRESHOLD_MS;
  if (dueNow) {
    return enqueue({ type: "action", action: command, action_command_id: actionCommandId });
  }
  return actionCommandId;
}

/**
 * Enqueue an existing action command (e.g. scheduled send that is now due). Used by process-scheduled-sends cron.
 */
export async function enqueueExistingSendMessage(actionCommandId: string, command: ActionCommand): Promise<string> {
  return enqueue({ type: "action", action: command, action_command_id: actionCommandId });
}
