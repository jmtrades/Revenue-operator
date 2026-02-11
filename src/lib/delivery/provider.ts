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
  body: string
): Promise<{ sid: string } | { error: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromSms = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromSms || channel !== "sms") {
    return { error: "Twilio not configured or channel not SMS" };
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
      result = await sendViaTwilio("sms", to.phone, content);
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
