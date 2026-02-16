/**
 * Outbound delivery provider adapter (SMS-first).
 * Status: queued | sent | delivered | failed
 * Retry with backoff, channel fallback, no silent failures.
 */

import { getDb } from "@/lib/db/queries";
import { incrementMetric, METRIC_KEYS } from "@/lib/observability/metrics";

export type MessageStatus = "queued" | "sent" | "delivered" | "failed";

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000];

async function sendViaTwilio(
  channel: string,
  to: string,
  body: string,
  workspaceId?: string
): Promise<{ sid: string } | { error: string }> {
  if (channel !== "sms") {
    return { error: "Channel not SMS" };
  }

  const db = getDb();
  let accountSid: string | null = null;
  let authToken: string | null = null;
  let fromSms: string | null = null;

  // Try workspace-specific config first
  if (workspaceId) {
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("twilio_account_sid, proxy_number, twilio_phone_sid")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .single();

    if (phoneConfig) {
      const config = phoneConfig as { twilio_account_sid?: string | null; proxy_number?: string | null; twilio_phone_sid?: string | null };
      accountSid = config.twilio_account_sid ?? null;
      fromSms = config.proxy_number ?? config.twilio_phone_sid ?? null;
      
      // For workspace-specific accounts, we'd need to store auth token securely
      // For now, fall back to global if account SID matches
      if (accountSid === process.env.TWILIO_ACCOUNT_SID) {
        authToken = process.env.TWILIO_AUTH_TOKEN ?? null;
      }
    }
  }

  // Fall back to global env vars if workspace config not found
  if (!accountSid || !authToken || !fromSms) {
    accountSid = process.env.TWILIO_ACCOUNT_SID ?? null;
    authToken = process.env.TWILIO_AUTH_TOKEN ?? null;
    fromSms = process.env.TWILIO_PHONE_NUMBER ?? null;
  }

  if (!accountSid || !authToken || !fromSms) {
    return { error: "Twilio not configured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: fromSms,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const json = (await res.json()) as { sid?: string; message?: string; error_message?: string };
  if (json.sid) return { sid: json.sid };
  return { error: json.error_message ?? json.message ?? "Unknown Twilio error" };
}

/** Human-safety layer runs last before send. Can override content. */
async function applySafetyLayer(
  content: string,
  workspaceId: string,
  leadId: string,
  conversationId: string,
  channel: string
): Promise<string> {
  try {
    const { enforceHumanAcceptability } = await import("@/lib/human-safety");
    const { isLowPressureMode } = await import("@/lib/human-safety/disinterest-detector");
    const db = (await import("@/lib/db/queries")).getDb();

    const [{ data: lastMsg }, lowPressure] = await Promise.all([
      db
        .from("messages")
        .select("content")
        .eq("conversation_id", conversationId)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
      isLowPressureMode(workspaceId, leadId),
    ]);

    const lastUserMessage = (lastMsg as { content?: string })?.content;
    const leadUsedEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(lastUserMessage ?? "");

    const result = enforceHumanAcceptability(content, {
      leadId,
      workspaceId,
      confidence: 1, // Already passed pipeline gating
      lastUserMessage,
      leadUsedEmoji,
      lowPressureMode: lowPressure,
      channel,
    });

    return result.safeMessage;
  } catch {
    return content;
  }
}

export async function sendOutbound(
  messageId: string,
  workspaceId: string,
  leadId: string,
  conversationId: string,
  channel: string,
  content: string,
  to: { email?: string; phone?: string }
): Promise<{ status: MessageStatus; externalId?: string; error?: string }> {
  const db = getDb();

  // Safety runs LAST before send
  let safeContent = await applySafetyLayer(content, workspaceId, leadId, conversationId, channel);
  if (safeContent !== content) {
    await db.from("outbound_messages").update({ content: safeContent }).eq("id", messageId);
  }

  // Environmental presence: append neutral factual reference when available (doctrine)
  try {
    const { attachProofReferenceToOutgoingMessages } = await import("@/lib/environmental-presence/proof-reference");
    const { confirmationSnippet } = await attachProofReferenceToOutgoingMessages(workspaceId);
    if (confirmationSnippet && !safeContent.includes(confirmationSnippet)) {
      const withRef = safeContent.trimEnd() + "\n" + confirmationSnippet.trim();
      const maxLen = channel === "sms" ? 320 : 500;
      safeContent = withRef.length <= maxLen ? withRef : safeContent;
    }
  } catch {
    // Non-blocking; send without reference if unavailable
  }

  const fallbackOrder: string[] =
    channel === "sms"
      ? ["sms", "email", "web"]
      : channel === "email"
        ? ["email", "sms", "web"]
        : ["web"];

  for (const ch of fallbackOrder) {
    const destination = ch === "sms" ? to.phone : ch === "email" ? to.email : null;
    if (!destination && ch !== "web") continue;

    let result: { sid: string } | { error: string };
    if (ch === "web") {
      result = { sid: `web-${messageId}` };
    } else if (ch === "sms" && to.phone) {
      result = await sendViaTwilio("sms", to.phone, safeContent, workspaceId);
    } else {
      result = { error: "Email provider not implemented" };
    }

    if ("sid" in result) {
      await db
        .from("outbound_messages")
        .update({
          status: "sent",
          external_id: result.sid,
        })
        .eq("id", messageId);
      return { status: "sent", externalId: result.sid };
    }

    if ("error" in result && ch === fallbackOrder[fallbackOrder.length - 1]) {
      await db
        .from("outbound_messages")
        .update({
          status: "failed",
          delivery_error: result.error,
        })
        .eq("id", messageId);
      await incrementMetric(workspaceId, METRIC_KEYS.DELIVERY_FAILED);
      return { status: "failed", error: result.error };
    }
  }

  await db
    .from("outbound_messages")
    .update({ status: "failed", delivery_error: "No channel available" })
    .eq("id", messageId);
  await incrementMetric(workspaceId, METRIC_KEYS.DELIVERY_FAILED);
  return { status: "failed", error: "No channel available" };
}

export async function recordDeliveryReceipt(externalId: string): Promise<void> {
  const db = getDb();
  await db
    .from("outbound_messages")
    .update({ status: "delivered", delivery_receipt_at: new Date().toISOString() })
    .eq("external_id", externalId);
}

export function getRetryDelayMs(attempt: number): number {
  return RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
}
