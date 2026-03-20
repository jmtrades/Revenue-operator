/**
 * Telnyx SMS/messaging webhook handler.
 * Receives inbound SMS and delivery/status updates from Telnyx Messaging API.
 *
 * Webhook verification uses HMAC-SHA256 with TELNYX_PUBLIC_KEY.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import {
  verifyTelnyxWebhook,
  parseTelnyxEvent,
  extractMessageInfo,
  isMessageEvent,
  type TelnyxWebhookPayload,
} from "@/lib/telephony/telnyx-webhooks";

/**
 * POST /api/webhooks/telnyx/inbound
 * Receive SMS and message status updates from Telnyx
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-telnyx-signature-ed25519") ?? undefined;

  // Verify webhook signature — rejects if key missing or sig invalid
  if (!verifyTelnyxWebhook(body, signature)) {
    log("warn", "telnyx_sms.invalid_signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: TelnyxWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { eventType } = parseTelnyxEvent(payload);

  if (!isMessageEvent(eventType)) {
    return NextResponse.json({ ok: true });
  }

  const messageInfo = extractMessageInfo(payload);
  if (!messageInfo) {
    log("warn", "telnyx_sms.no_message_info", { eventType });
    return NextResponse.json({ ok: true });
  }

  const db = getDb();

  try {
    switch (eventType) {
      case "message.delivered":
        log("info", "telnyx_sms.delivered", { messageId: messageInfo.messageId });
        if (messageInfo.messageId) {
          await db
            .from("outbound_messages")
            .update({ status: "delivered", delivery_receipt_at: new Date().toISOString() })
            .eq("external_id", messageInfo.messageId);
        }
        break;

      case "message.sent":
        log("info", "telnyx_sms.sent", { messageId: messageInfo.messageId });
        if (messageInfo.messageId) {
          await db
            .from("outbound_messages")
            .update({ status: "sent" })
            .eq("external_id", messageInfo.messageId);
        }
        break;

      case "message.failed":
        log("warn", "telnyx_sms.failed", { messageId: messageInfo.messageId });
        if (messageInfo.messageId) {
          const errorMessage = messageInfo.errors?.[0]?.message || "Unknown error";
          await db
            .from("outbound_messages")
            .update({ status: "failed", delivery_error: errorMessage })
            .eq("external_id", messageInfo.messageId);
        }
        break;

      default:
        log("info", "telnyx_sms.unhandled_event", { eventType });
    }
  } catch (err) {
    log("error", "telnyx_sms.processing_error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}
