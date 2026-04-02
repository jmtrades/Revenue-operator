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

  // Opt-out keywords for TCPA/GDPR compliance
  const OPT_OUT_KEYWORDS = new Set(["stop", "unsubscribe", "cancel", "quit", "end", "opt out", "optout"]);
  const OPT_IN_KEYWORDS = new Set(["start", "subscribe", "unstop", "opt in", "optin"]);

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

      default: {
        // Handle inbound SMS messages (message.received or unrecognized message events)
        const inboundText = (messageInfo.text ?? "").trim().toLowerCase();
        const fromPhone = messageInfo.from;
        const toPhone = messageInfo.to;

        if (inboundText && fromPhone) {
          log("info", "telnyx_sms.inbound_received", { from: fromPhone, to: toPhone, text: inboundText.slice(0, 50) });

          // Look up the workspace from the receiving number
          const { data: phoneConfig } = await db
            .from("phone_configs")
            .select("workspace_id")
            .eq("proxy_number", toPhone)
            .eq("status", "active")
            .maybeSingle();

          const workspaceId = (phoneConfig as { workspace_id?: string } | null)?.workspace_id;

          if (workspaceId) {
            // Check for opt-out keywords (TCPA compliance)
            if (OPT_OUT_KEYWORDS.has(inboundText)) {
              log("info", "telnyx_sms.opt_out", { from: fromPhone, workspaceId });
              await db
                .from("leads")
                .update({ opt_out: true, updated_at: new Date().toISOString() })
                .eq("workspace_id", workspaceId)
                .or(`phone.eq.${fromPhone},phone.eq.${fromPhone.replace(/\D/g, "")}`);
            }
            // Check for opt-in keywords (re-subscribe)
            else if (OPT_IN_KEYWORDS.has(inboundText)) {
              log("info", "telnyx_sms.opt_in", { from: fromPhone, workspaceId });
              await db
                .from("leads")
                .update({ opt_out: false, updated_at: new Date().toISOString() })
                .eq("workspace_id", workspaceId)
                .or(`phone.eq.${fromPhone},phone.eq.${fromPhone.replace(/\D/g, "")}`);
            }

            // Store inbound message for inbox
            try {
              await db.from("chat_widget_messages").insert({
                workspace_id: workspaceId,
                sender_type: "visitor",
                content: messageInfo.text?.slice(0, 2000) ?? "",
                channel: "sms",
                metadata: { from: fromPhone, to: toPhone, message_id: messageInfo.messageId },
              });
            } catch (err) {
              log("error", "telnyx_sms.inbound_store_failed", { error: err instanceof Error ? err.message : String(err) });
            }

            // Pause any active follow-up sequences — lead has replied
            try {
              const normalizedPhone = fromPhone.replace(/[^\d+]/g, "");
              const { data: lead } = await db
                .from("leads")
                .select("id")
                .eq("workspace_id", workspaceId)
                .or(`phone.eq.${normalizedPhone},phone.eq.${fromPhone}`)
                .limit(1)
                .maybeSingle();
              if (lead) {
                const { pauseOnLeadReply } = await import("@/lib/sequences/follow-up-engine");
                await pauseOnLeadReply(workspaceId, (lead as { id: string }).id, "inbound_sms");
              }
            } catch {
              // Non-blocking: sequence engine may not be available
            }
          }
        } else {
          log("info", "telnyx_sms.unhandled_event", { eventType });
        }
      }
    }
  } catch (err) {
    log("error", "telnyx_sms.processing_error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}
