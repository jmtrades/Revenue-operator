/**
 * Telnyx SMS/messaging webhook handler.
 * Receives inbound SMS and delivery/status updates from Telnyx Messaging API.
 *
 * Webhook verification uses HMAC-SHA256 with TELNYX_PUBLIC_KEY.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
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
  const signature = req.headers.get("x-telnyx-signature-ed25519");

  // Verify webhook signature
  if (!verifyTelnyxWebhook(body, signature)) {
    console.warn("[telnyx-sms] Invalid webhook signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: TelnyxWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { eventType, data } = parseTelnyxEvent(payload);

  if (!isMessageEvent(eventType)) {
    // Not a message event, skip
    return NextResponse.json({ ok: true });
  }

  const messageInfo = extractMessageInfo(payload);
  if (!messageInfo) {
    console.warn("[telnyx-sms] Could not extract message info from event", eventType);
    return NextResponse.json({ ok: true });
  }

  const db = getDb();

  try {
    switch (eventType) {
      case "message.delivered":
        // Outbound SMS was delivered
        console.log("[telnyx-sms] Message delivered:", messageInfo.messageId);
        if (messageInfo.messageId) {
          await db
            .from("outbound_messages")
            .update({
              status: "delivered",
              delivery_receipt_at: new Date().toISOString(),
            })
            .eq("external_id", messageInfo.messageId);
        }
        break;

      case "message.sent":
        // Outbound SMS was sent (queued/accepted)
        console.log("[telnyx-sms] Message sent:", messageInfo.messageId);
        if (messageInfo.messageId) {
          await db
            .from("outbound_messages")
            .update({
              status: "sent",
            })
            .eq("external_id", messageInfo.messageId);
        }
        break;

      case "message.failed":
        // Outbound SMS failed
        console.log("[telnyx-sms] Message failed:", messageInfo.messageId, messageInfo.errors);
        if (messageInfo.messageId) {
          const errorMessage = messageInfo.errors?.[0]?.message || "Unknown error";
          await db
            .from("outbound_messages")
            .update({
              status: "failed",
              delivery_error: errorMessage,
            })
            .eq("external_id", messageInfo.messageId);
        }
        break;

      default:
        console.log("[telnyx-sms] Unhandled event type:", eventType);
    }
  } catch (err) {
    console.error(
      "[telnyx-sms] Error processing webhook:",
      err instanceof Error ? err.message : err
    );
    // Still return 200 to acknowledge receipt
  }

  return NextResponse.json({ ok: true });
}
