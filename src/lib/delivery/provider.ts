/**
 * Outbound delivery provider adapter (SMS-first).
 * Status: queued | sent | delivered | failed
 * Retry with backoff, channel fallback, no silent failures.
 * Supports both Twilio and Telnyx providers.
 */

import { getDb } from "@/lib/db/queries";
import { incrementMetric, METRIC_KEYS } from "@/lib/observability/metrics";
import { getTelephonyProvider } from "@/lib/telephony/get-telephony-provider";
import { sendSms as sendSmsTelnyx } from "@/lib/telephony/telnyx-sms";

export type MessageStatus = "queued" | "sent" | "delivered" | "failed";

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000];

async function sendViaTelnyx(
  channel: string,
  to: string,
  body: string,
  workspaceId?: string
): Promise<{ messageId: string } | { error: string }> {
  if (channel !== "sms" && channel !== "whatsapp") {
    return { error: "Telnyx: Channel must be sms (WhatsApp not yet supported)" };
  }

  const db = getDb();
  let fromNumber: string | null = null;
  let messagingProfileId: string | null = null;

  // Try workspace-specific config first
  if (workspaceId) {
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("proxy_number")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .maybeSingle();

    if (phoneConfig) {
      const config = phoneConfig as { proxy_number?: string | null };
      fromNumber = config.proxy_number ?? null;
    }
  }

  // Fall back to environment default
  if (!fromNumber) {
    fromNumber = process.env.TELNYX_PHONE_NUMBER ?? null;
  }

  if (!fromNumber) {
    return { error: "Telnyx not configured: no phone number available" };
  }

  messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID ?? null;

  // Normalize phone numbers
  const toAddr = to.startsWith("+") ? to : to.replace(/\D/g, "").length === 10 ? `+1${to.replace(/\D/g, "")}` : to;
  const fromAddr = fromNumber.startsWith("+") ? fromNumber : fromNumber.replace(/\D/g, "").length === 10 ? `+1${fromNumber.replace(/\D/g, "")}` : fromNumber;

  const result = await sendSmsTelnyx({
    from: fromAddr,
    to: toAddr,
    text: body,
    messagingProfileId: messagingProfileId ?? undefined,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  return { messageId: result.messageId };
}

async function sendViaTwilio(
  channel: string,
  to: string,
  body: string,
  workspaceId?: string
): Promise<{ sid: string } | { error: string }> {
  if (channel !== "sms" && channel !== "whatsapp") {
    return { error: "Channel must be sms or whatsapp" };
  }

  const db = getDb();
  let accountSid: string | null = null;
  let authToken: string | null = null;
  let fromNumber: string | null = null;

  // Try workspace-specific config first
  if (workspaceId) {
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("twilio_account_sid, proxy_number, twilio_phone_sid, outbound_from_number, whatsapp_enabled")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .maybeSingle();

    if (phoneConfig) {
      const config = phoneConfig as {
        twilio_account_sid?: string | null;
        proxy_number?: string | null;
        twilio_phone_sid?: string | null;
        outbound_from_number?: string | null;
        whatsapp_enabled?: boolean | null;
      };
      accountSid = config.twilio_account_sid ?? null;
      // Outbound from personal/existing number when set; otherwise use connected number
      fromNumber = config.outbound_from_number?.trim() || config.proxy_number || config.twilio_phone_sid || null;
      if (accountSid === process.env.TWILIO_ACCOUNT_SID) {
        authToken = process.env.TWILIO_AUTH_TOKEN ?? null;
      }
      // WhatsApp only if enabled for this workspace
      if (channel === "whatsapp" && !config.whatsapp_enabled) {
        return { error: "WhatsApp not enabled for this workspace" };
      }
    }
  }

  if (!accountSid || !authToken || !fromNumber) {
    accountSid = accountSid ?? process.env.TWILIO_ACCOUNT_SID ?? null;
    authToken = authToken ?? process.env.TWILIO_AUTH_TOKEN ?? null;
    fromNumber = fromNumber ?? process.env.TWILIO_PHONE_NUMBER ?? null;
  }

  if (!accountSid || !authToken || !fromNumber) {
    return { error: "Twilio not configured" };
  }

  // Twilio WhatsApp: From/To use whatsapp:+E164 format
  const prefix = channel === "whatsapp" ? "whatsapp:" : "";
  const toAddr = prefix + (to.startsWith("+") ? to : to.replace(/\D/g, "").length === 10 ? `+1${to.replace(/\D/g, "")}` : to);
  const fromAddr = prefix + (fromNumber.startsWith("+") ? fromNumber : fromNumber.replace(/\D/g, "").length === 10 ? `+1${fromNumber.replace(/\D/g, "")}` : fromNumber);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: toAddr,
    From: fromAddr,
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
        .maybeSingle(),
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
  to: { email?: string; phone?: string },
  emailSubject?: string
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
      const maxLen = channel === "sms" ? 320 : channel === "whatsapp" ? 1600 : 500;
      safeContent = withRef.length <= maxLen ? withRef : safeContent;
    }
  } catch {
    // Non-blocking; send without reference if unavailable
  }

  // Content must already be governed (canonical pipeline). Executor only sends.
  const sendChannel: "sms" | "email" | "whatsapp" = channel === "whatsapp" ? "whatsapp" : channel === "email" ? "email" : "sms";

  const fallbackOrder: string[] =
    channel === "whatsapp"
      ? ["whatsapp", "sms", "email", "web"]
      : channel === "sms"
        ? ["sms", "whatsapp", "email", "web"]
        : channel === "email"
          ? ["email", "sms", "web"]
          : ["web"];

  const provider = getTelephonyProvider();

  for (const ch of fallbackOrder) {
    const destination = ch === "sms" || ch === "whatsapp" ? to.phone : ch === "email" ? to.email : null;
    if (!destination && ch !== "web") continue;

    let result: { sid: string; messageId?: string } | { error: string };
    if (ch === "web") {
      result = { sid: `web-${messageId}` };
    } else if ((ch === "sms" || ch === "whatsapp") && to.phone) {
      if (provider === "telnyx") {
        const telnyxResult = await sendViaTelnyx(ch, to.phone, safeContent, workspaceId);
        if ("error" in telnyxResult) {
          result = telnyxResult;
        } else {
          result = { sid: telnyxResult.messageId, messageId: telnyxResult.messageId };
        }
      } else {
        result = await sendViaTwilio(ch, to.phone, safeContent, workspaceId);
      }
    } else if (ch === "email" && to.email) {
      const { sendEmail } = await import("@/lib/integrations/email");
      const sendResult = await sendEmail(workspaceId, to.email, emailSubject ?? "Message from Recall Touch", safeContent);
      result = sendResult.ok && sendResult.externalId ? { sid: sendResult.externalId } : { error: sendResult.error ?? "Send failed" };
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
      try {
        const { recordMessageTrace } = await import("@/lib/speech-governance/trace");
        await recordMessageTrace({
          workspace_id: workspaceId,
          channel: sendChannel,
          intent_type: "follow_up",
          rendered_text: safeContent,
          result_status: "sent",
        });
        await db.from("audit_log").insert({
          workspace_id: workspaceId,
          actor_user_id: null,
          actor_type: "system",
          action_type: "message_sent",
          details_json: { channel: sendChannel },
        });
      } catch {
        // Non-blocking
      }
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
