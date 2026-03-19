/**
 * Telnyx voice webhook handler.
 * Receives call events from Telnyx Call Control API.
 *
 * Webhook verification uses HMAC-SHA256 with TELNYX_PUBLIC_KEY.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import {
  verifyTelnyxWebhook,
  parseTelnyxEvent,
  extractCallInfo,
  isCallEvent,
  type TelnyxWebhookPayload,
} from "@/lib/telephony/telnyx-webhooks";

/**
 * POST /api/webhooks/telnyx/voice
 * Receive call events from Telnyx
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-telnyx-signature-ed25519");

  // Verify webhook signature
  if (!verifyTelnyxWebhook(body, signature)) {
    console.warn("[telnyx-voice] Invalid webhook signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: TelnyxWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { eventType, data } = parseTelnyxEvent(payload);

  if (!isCallEvent(eventType)) {
    // Not a call event, skip
    return NextResponse.json({ ok: true });
  }

  const callInfo = extractCallInfo(payload);
  if (!callInfo) {
    console.warn("[telnyx-voice] Could not extract call info from event", eventType);
    return NextResponse.json({ ok: true });
  }

  const db = getDb();

  try {
    switch (eventType) {
      case "call.initiated":
        // Call created but not yet connected
        console.log("[telnyx-voice] Call initiated:", callInfo.callSessionId);
        break;

      case "call.answered":
        // Call was answered
        console.log("[telnyx-voice] Call answered:", callInfo.callSessionId);
        if (callInfo.callSessionId) {
          await db
            .from("call_sessions")
            .update({
              call_started_at: new Date().toISOString(),
            })
            .eq("external_meeting_id", callInfo.callSessionId);
        }
        break;

      case "call.hangup":
        // Call ended
        console.log("[telnyx-voice] Call hung up:", callInfo.callSessionId);
        if (callInfo.callSessionId) {
          await db
            .from("call_sessions")
            .update({
              call_ended_at: new Date().toISOString(),
            })
            .eq("external_meeting_id", callInfo.callSessionId);
        }
        break;

      case "call.streaming.started":
        console.log("[telnyx-voice] Streaming started:", callInfo.callSessionId);
        break;

      case "call.streaming.stopped":
        console.log("[telnyx-voice] Streaming stopped:", callInfo.callSessionId);
        break;

      default:
        console.log("[telnyx-voice] Unhandled event type:", eventType);
    }
  } catch (err) {
    console.error(
      "[telnyx-voice] Error processing webhook:",
      err instanceof Error ? err.message : err
    );
    // Still return 200 to acknowledge receipt
  }

  return NextResponse.json({ ok: true });
}
