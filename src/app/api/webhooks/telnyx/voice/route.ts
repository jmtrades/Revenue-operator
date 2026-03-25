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
import { handleInboundCall } from "@/lib/voice/call-flow";
import {
  verifyTelnyxWebhook,
  parseTelnyxEvent,
  extractCallInfo,
  isCallEvent,
  type TelnyxWebhookPayload,
} from "@/lib/telephony/telnyx-webhooks";
import { answerCall, startStreamingAudio, speakText, hangupCall } from "@/lib/telephony/telnyx-voice";

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
  const direction = payload.data?.record?.direction;

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
      case "call.initiated": {
        // Only handle inbound calls on call.initiated
        if (direction !== "incoming") {
          log("info", "telnyx_voice.call_initiated_outbound", { sessionId: callInfo.callSessionId, direction });
          break;
        }

        log("info", "telnyx_voice.call_initiated_inbound", { sessionId: callInfo.callSessionId, to: callInfo.to, from: callInfo.from });

        // 1. Look up workspace from phone_configs using the 'to' (called) number
        const { data: phoneConfig } = await db
          .from("phone_configs")
          .select("workspace_id")
          .eq("proxy_number", callInfo.to)
          .eq("status", "active")
          .maybeSingle();

        const workspaceId = (phoneConfig as { workspace_id?: string } | null)?.workspace_id ?? null;

        if (!workspaceId) {
          // No workspace found — answer call and play error message, then hang up
          log("warn", "telnyx_voice.no_workspace_for_number", { to: callInfo.to, callControlId: callInfo.callControlId });
          if (callInfo.callControlId) {
            await answerCall(callInfo.callControlId);
            await speakText(callInfo.callControlId, "We're sorry, this number is not currently in service. Please check the number and try again.");
            await hangupCall(callInfo.callControlId);
          }
          break;
        }

        // 2. Look up or create a lead from the 'from' (caller) number
        let leadId: string | null = null;
        const phone = (callInfo.from ?? "").replace(/\D/g, "");
        if (phone.length >= 10) {
          const { data: existingLead } = await db
            .from("leads")
            .select("id")
            .eq("workspace_id", workspaceId)
            .or(`phone.eq.${callInfo.from},phone.eq.${phone}`)
            .limit(1)
            .maybeSingle();

          leadId = (existingLead as { id: string } | null)?.id ?? null;

          if (!leadId) {
            const { data: createdLead } = await db
              .from("leads")
              .insert({
                workspace_id: workspaceId,
                name: "Inbound caller",
                phone: callInfo.from ?? undefined,
                status: "NEW",
              })
              .select("id")
              .maybeSingle();

            leadId = (createdLead as { id: string } | null)?.id ?? null;
          }
        }

        // 3. Create a call_sessions row
        let callSessionId: string | null = null;
        try {
          const { data: existingSession } = await db
            .from("call_sessions")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("external_meeting_id", callInfo.callSessionId)
            .maybeSingle();

          if (!existingSession) {
            const { data: inserted } = await db
              .from("call_sessions")
              .insert({
                workspace_id: workspaceId,
                lead_id: leadId,
                external_meeting_id: callInfo.callSessionId,
                provider: "telnyx",
                call_started_at: new Date().toISOString(),
              })
              .select("id")
              .maybeSingle();

            callSessionId = (inserted as { id: string } | null)?.id ?? null;
          } else {
            callSessionId = (existingSession as { id: string }).id;
          }
        } catch (sessionErr) {
          log("error", "telnyx_voice.call_session_creation_failed", {
            error: sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
            workspaceId,
          });
        }

        // 4. Answer the call
        if (callInfo.callControlId) {
          const answerResult = await answerCall(callInfo.callControlId);
          if ("error" in answerResult) {
            log("error", "telnyx_voice.answer_failed", { error: answerResult.error, callControlId: callInfo.callControlId });
            break;
          }

          // 5. Start streaming audio after answering
          const voiceServerUrl = process.env.VOICE_SERVER_URL;
          if (!voiceServerUrl) {
            log("error", "telnyx_voice.voice_server_not_configured");
            await speakText(callInfo.callControlId, "I'm experiencing a technical issue. Please try again later.");
            await hangupCall(callInfo.callControlId);
            break;
          }
          // Pass workspace_id as query param so voice server can forward it to LLM endpoint
          const wsBase = voiceServerUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:") + "/ws/conversation";
          const wsUrl = workspaceId ? `${wsBase}?workspace_id=${encodeURIComponent(workspaceId)}` : wsBase;

          const streamResult = await startStreamingAudio(callInfo.callControlId, wsUrl);
          if ("error" in streamResult) {
            log("error", "telnyx_voice.streaming_start_failed", { error: streamResult.error, callControlId: callInfo.callControlId });
          } else {
            log("info", "telnyx_voice.streaming_started", { callControlId: callInfo.callControlId, wsUrl: wsBase, workspaceId });
          }
        }

        break;
      }

      case "call.answered": {
        const isOutbound = direction === "outgoing";
        log("info", "telnyx_voice.call_answered", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId, direction });

        // For outbound demo calls (no workspace), answer and stream to voice server directly
        if (isOutbound && !resolvedWorkspaceId && callInfo.callControlId) {
          log("info", "telnyx_voice.demo_outbound_answered", { callControlId: callInfo.callControlId });
          const voiceServerUrl = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL;
          if (!voiceServerUrl) {
            log("error", "telnyx_voice.voice_server_not_configured_demo");
            await speakText(callInfo.callControlId, "I'm experiencing a technical issue. Please try again later.");
            await hangupCall(callInfo.callControlId);
            break;
          }
          const wsUrl = voiceServerUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:") + "/ws/conversation";

          const streamResult = await startStreamingAudio(callInfo.callControlId, wsUrl);
          if ("error" in streamResult) {
            log("error", "telnyx_voice.demo_streaming_failed", { error: streamResult.error });
            // Fallback: speak a greeting using Telnyx built-in TTS
            await speakText(
              callInfo.callControlId,
              "Hey there! This is Sarah from Recall Touch. I'm an AI phone agent, and I wanted to show you what your callers would experience. Unfortunately I'm having a small technical issue connecting to my full brain right now, but normally I'd be chatting with you just like a real person. Try us again in a moment, or start a free trial at recall dash touch dot com. Thanks for checking us out!",
              "female"
            );
          } else {
            log("info", "telnyx_voice.demo_streaming_started", { callControlId: callInfo.callControlId, wsUrl });
          }
          break;
        }

        // After workspace is resolved, try to handle the call with the voice AI
        if (callInfo.callSessionId && resolvedWorkspaceId) {
          try {
            // Use handleInboundCall to set up voice AI
            // For Telnyx, we'll pass the callSessionId as the callSid equivalent
            await handleInboundCall({
              workspaceId: resolvedWorkspaceId,
              callSid: callInfo.callSessionId,
              callerPhone: callInfo.from ?? "",
            });
          } catch (callFlowErr) {
            log("warn", "telnyx_voice.call_flow_error", {
              error: callFlowErr instanceof Error ? callFlowErr.message : String(callFlowErr),
              sessionId: callInfo.callSessionId,
            });
          }

          // Update call_started_at timestamp
          await db
            .from("call_sessions")
            .update({ call_started_at: new Date().toISOString() })
            .eq("external_meeting_id", callInfo.callSessionId)
            .eq("workspace_id", resolvedWorkspaceId);
        }
        break;
      }

      case "call.hangup": {
        log("info", "telnyx_voice.call_hangup", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId });
        if (callInfo.callSessionId && resolvedWorkspaceId) {
          await db
            .from("call_sessions")
            .update({ call_ended_at: new Date().toISOString() })
            .eq("external_meeting_id", callInfo.callSessionId)
            .eq("workspace_id", resolvedWorkspaceId);

          // Trigger post-call processing asynchronously
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
          if (!appUrl) {
            log("error", "telnyx_voice.app_url_not_configured");
          } else {
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
        }
        break;
      }

      case "call.streaming.started":
      case "call.streaming.stopped":
        log("info", `telnyx_voice.${eventType.replace(/\./g, "_")}`, { sessionId: callInfo.callSessionId });
        break;

      case "call.machine.detected": {
        // Answering machine detected — log and optionally leave voicemail
        const machineType = payload.data?.record?.state; // "machine_start" | "human" | "fax_detected"
        log("info", "telnyx_voice.machine_detected", { sessionId: callInfo.callSessionId, machineType, workspaceId: resolvedWorkspaceId });

        if (machineType === "fax_detected" && callInfo.callControlId) {
          // Fax line — hang up immediately
          await hangupCall(callInfo.callControlId);
        }
        // For voicemail machines, the voice server will handle the conversation naturally
        // It will detect silence and wrap up. No special handling needed.
        break;
      }

      case "call.machine.greeting.ended": {
        // Voicemail greeting finished — the AI can now leave a message
        log("info", "telnyx_voice.machine_greeting_ended", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId });
        // Voice server is already streaming — it will naturally speak after the beep
        break;
      }

      case "call.speak.ended": {
        // Telnyx TTS finished speaking (used in fallback scenarios)
        log("info", "telnyx_voice.speak_ended", { sessionId: callInfo.callSessionId });
        break;
      }

      case "call.dtmf.received": {
        // DTMF keypress detected — could be used for menu navigation
        const digit = payload.data?.record?.state; // The pressed digit
        log("info", "telnyx_voice.dtmf_received", { sessionId: callInfo.callSessionId, digit, workspaceId: resolvedWorkspaceId });
        // Future: route to different departments based on keypress
        break;
      }

      case "call.bridged": {
        // Call was bridged/transferred to another party
        log("info", "telnyx_voice.call_bridged", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId });
        if (callInfo.callSessionId && resolvedWorkspaceId) {
          await db
            .from("call_sessions")
            .update({ transferred_at: new Date().toISOString() })
            .eq("external_meeting_id", callInfo.callSessionId)
            .eq("workspace_id", resolvedWorkspaceId);
        }
        break;
      }

      case "call.recording.saved": {
        // Call recording saved — store the recording URL
        log("info", "telnyx_voice.recording_saved", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId });
        // Future: save recording_url to call_sessions for playback
        break;
      }

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
