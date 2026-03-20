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
  const signature = req.headers.get("x-telnyx-signature-ed25519") ?? undefined;

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

  // Resolve workspace_id from call session for defense-in-depth workspace isolation
  let resolvedWorkspaceId: string | null = null;
  if (callInfo.callSessionId) {
    const { data: sessionRow } = await db
      .from("call_sessions")
      .select("workspace_id")
      .eq("external_meeting_id", callInfo.callSessionId)
      .maybeSingle();
    resolvedWorkspaceId = (sessionRow as { workspace_id?: string } | null)?.workspace_id ?? null;
  }

  try {
    switch (eventType) {
      case "call.initiated":
        log("info", "telnyx_voice.call_initiated", { sessionId: callInfo.callSessionId });
        break;

      case "call.answered":
        log("info", "telnyx_voice.call_answered", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId });
        if (callInfo.callSessionId && resolvedWorkspaceId) {
          await db
            .from("call_sessions")
            .update({ call_started_at: new Date().toISOString() })
            .eq("external_meeting_id", callInfo.callSessionId)
            .eq("workspace_id", resolvedWorkspaceId);
        }
        break;

      case "call.hangup":
        log("info", "telnyx_voice.call_hangup", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId });
        if (callInfo.callSessionId && resolvedWorkspaceId) {
          await db
            .from("call_sessions")
            .update({ call_ended_at: new Date().toISOString() })
            .eq("external_meeting_id", callInfo.callSessionId)
            .eq("workspace_id", resolvedWorkspaceId);

          // Trigger post-call processing asynchronously
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
          fetch(`${appUrl}/api/inbound/post-call`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              call_session_id: callInfo.callSessionId,
              workspace_id: resolvedWorkspaceId,
              source: "telnyx_hangup",
            }),
          }).catch((err) => {
            log("error", "telnyx_voice.post_call_trigger_failed", {
              error: err instanceof Error ? err.message : String(err),
              sessionId: callInfo.callSessionId,
            });
          });
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
