/**
 * Telnyx voice webhook handler.
 * Receives call events from Telnyx Call Control API.
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

  // Verify webhook signature — rejects if key missing or sig invalid
  if (!verifyTelnyxWebhook(body, signature)) {
    log("warn", "telnyx_voice.invalid_signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: TelnyxWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { eventType } = parseTelnyxEvent(payload);

  if (!isCallEvent(eventType)) {
    return NextResponse.json({ ok: true });
  }

  const callInfo = extractCallInfo(payload);
  if (!callInfo) {
    log("warn", "telnyx_voice.no_call_info", { eventType });
    return NextResponse.json({ ok: true });
  }

  const db = getDb();

  try {
    switch (eventType) {
      case "call.initiated":
        log("info", "telnyx_voice.call_initiated", { sessionId: callInfo.callSessionId });
        break;

      case "call.answered":
        log("info", "telnyx_voice.call_answered", { sessionId: callInfo.callSessionId });
        if (callInfo.callSessionId) {
          await db
            .from("call_sessions")
            .update({ call_started_at: new Date().toISOString() })
            .eq("external_meeting_id", callInfo.callSessionId);
        }
        break;

      case "call.hangup":
        log("info", "telnyx_voice.call_hangup", { sessionId: callInfo.callSessionId });
        if (callInfo.callSessionId) {
          await db
            .from("call_sessions")
            .update({ call_ended_at: new Date().toISOString() })
            .eq("external_meeting_id", callInfo.callSessionId);
        }
        break;

      case "call.streaming.started":
      case "call.streaming.stopped":
        log("info", `telnyx_voice.${eventType.replace(/\./g, "_")}`, { sessionId: callInfo.callSessionId });
        break;

      default:
        log("info", "telnyx_voice.unhandled_event", { eventType });
    }
  } catch (err) {
    log("error", "telnyx_voice.processing_error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}
