/**
 * Telnyx voice webhook handler.
 * Receives call events from Telnyx Call Control API.
 *
 * Webhook verification uses HMAC-SHA256 with TELNYX_PUBLIC_KEY.
 *
 * Demo call conversation flow:
 *  1. call.answered → Try streaming to voice server; fallback to gather_using_speak
 *  2. call.gather.ended → Extract speech → LLM response → gather_using_speak (loop)
 *  3. call.transcription → Accumulate speech → LLM response → speak (alternative loop)
 *  4. call.speak.ended → Continue listening (transcription mode)
 *  5. call.hangup → Cleanup, update lead, post-call processing
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
import {
  answerCall,
  startStreamingAudio,
  speakText,
  hangupCall,
  gatherUsingSpeech,
  startTranscription,
} from "@/lib/telephony/telnyx-voice";
import {
  generateDemoResponse,
  getRandomGreeting,
  DEMO_GREETING,
  encodeDemoState,
  decodeDemoState,
  type DemoCallState,
  type ConversationMessage,
} from "@/lib/voice/demo-agent";

/* ────────────────────────────────────────────────────────────────────────────
 * In-memory demo conversation state (fallback for transcription mode).
 * Keyed by callControlId. Cleaned up on hangup.
 * ──────────────────────────────────────────────────────────────────────────── */
const demoCallStates = new Map<
  string,
  {
    history: ConversationMessage[];
    turn: number;
    isSpeaking: boolean;
    pendingUtterance: string;
    lastTranscriptionAt: number;
    callStartedAt: number;
    silenceCount: number;
    callerPhone: string;
  }
>();

/* TTL cleanup: evict stale demo call states every 60s (prevents memory leak from abandoned calls) */
const DEMO_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes max call duration
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of demoCallStates) {
    if (now - state.callStartedAt > DEMO_STATE_TTL_MS) {
      demoCallStates.delete(key);
    }
  }
}, 60_000);

/* ────────────────────────────────────────────────────────────────────────────
 * Silence prompts — varied to feel natural, not repetitive
 * ──────────────────────────────────────────────────────────────────────────── */
const SILENCE_PROMPTS_INITIAL = [
  "Hey, are you still there? I'm Sarah from Revenue Operator. Feel free to ask me anything about our AI phone agents!",
  "Hi there! I'm Sarah, your AI demo agent. I'd love to show you what I can do — got any questions?",
  "Hey! Still there? No rush at all. Whenever you're ready, I'm here to chat about how Revenue Operator can help your business.",
];

const SILENCE_PROMPTS_ONGOING = [
  "I'm still here! Got any questions about Revenue Operator? I could tell you about pricing, how setup works, or anything else.",
  "Take your time! If you're curious about anything — pricing, how it works, what industries we serve — just ask.",
  "Still here whenever you're ready! I could tell you about our free trial if you're interested.",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Helper: Update lead status after demo call ends
 * ──────────────────────────────────────────────────────────────────────────── */
async function updateDemoLeadOnHangup(
  callerPhone: string,
  turnCount: number,
  callDurationSecs: number,
): Promise<void> {
  try {
    const db = getDb();
    const DEMO_WORKSPACE = process.env.DEMO_WORKSPACE_ID ?? "";
    if (!callerPhone || !DEMO_WORKSPACE) return;

    // Determine lead quality based on engagement
    let status = "DEMO_COMPLETED";
    let quality = "low";
    if (turnCount >= 6 && callDurationSecs >= 120) {
      status = "HOT_LEAD";
      quality = "high";
    } else if (turnCount >= 3 && callDurationSecs >= 60) {
      status = "WARM_LEAD";
      quality = "medium";
    }

    await db
      .from("leads")
      .update({
        status,
        metadata: {
          source: "website_hero",
          demo_origin: "call_me_now",
          demo_completed: true,
          demo_turns: turnCount,
          demo_duration_secs: callDurationSecs,
          demo_quality: quality,
          demo_completed_at: new Date().toISOString(),
        },
      })
      .eq("phone", callerPhone)
      .eq("workspace_id", DEMO_WORKSPACE);

    log("info", "telnyx_voice.demo_lead_updated", {
      phone: callerPhone.slice(0, 4) + "***",
      status,
      quality,
      turns: turnCount,
      durationSecs: callDurationSecs,
    });
  } catch (err) {
    log("warn", "telnyx_voice.demo_lead_update_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

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

  // Check client_state for demo mode flag
  const clientStateRaw = payload.data?.payload?.client_state ?? payload.data?.record?.client_state;
  const demoState = clientStateRaw ? decodeDemoState(clientStateRaw) : null;
  const isDemoCall = demoState?.mode === "demo" || (direction === "outgoing" && !resolvedWorkspaceId);

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
                state: "NEW",
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
            const { data: inserted, error: insertErr } = await db
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

            if (insertErr && (insertErr as { code?: string }).code === "23505") {
              // Unique constraint violation — concurrent webhook retry, session already exists
              const { data: retryLookup } = await db
                .from("call_sessions")
                .select("id")
                .eq("external_meeting_id", callInfo.callSessionId)
                .maybeSingle();
              callSessionId = (retryLookup as { id: string } | null)?.id ?? null;
            } else {
              callSessionId = (inserted as { id: string } | null)?.id ?? null;
            }
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
        log("info", "telnyx_voice.call_answered", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId, direction, isDemoCall });

        // ── Demo outbound call: start AI conversation ──
        if (isDemoCall && callInfo.callControlId) {
          log("info", "telnyx_voice.demo_outbound_answered", { callControlId: callInfo.callControlId });

          // Pick a greeting variant for variety
          const greeting = getRandomGreeting();

          // Strategy 1: Try voice server streaming first (lowest latency, most natural)
          const voiceServerUrl = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL;
          let streamingWorked = false;

          if (voiceServerUrl) {
            const wsUrl = voiceServerUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:") + "/ws/conversation?mode=demo";
            const streamResult = await startStreamingAudio(callInfo.callControlId, wsUrl);
            if (!("error" in streamResult)) {
              log("info", "telnyx_voice.demo_streaming_started", { callControlId: callInfo.callControlId, wsUrl });
              streamingWorked = true;
            } else {
              log("warn", "telnyx_voice.demo_streaming_failed", { error: streamResult.error });
            }
          }

          if (!streamingWorked) {
            // Strategy 2: Transcription-based conversation (real-time, handles interruptions)
            const transcriptionResult = await startTranscription(callInfo.callControlId, {
              transcriptionTracks: "inbound",
            });

            if (!("error" in transcriptionResult)) {
              log("info", "telnyx_voice.demo_transcription_started", { callControlId: callInfo.callControlId });

              // Initialize in-memory state for transcription mode
              demoCallStates.set(callInfo.callControlId, {
                history: [{ role: "assistant", content: greeting }],
                turn: 0,
                isSpeaking: true,
                pendingUtterance: "",
                lastTranscriptionAt: Date.now(),
                callStartedAt: Date.now(),
                silenceCount: 0,
                callerPhone: callInfo.to ?? "",
              });

              // Speak the greeting (transcription will handle the conversation loop)
              const greetingState = encodeDemoState({
                mode: "demo",
                history: [{ role: "assistant", content: greeting }],
                turn: 0,
              });
              await speakText(callInfo.callControlId, greeting, "female", greetingState);
            } else {
              log("warn", "telnyx_voice.demo_transcription_failed", { error: transcriptionResult.error });

              // Strategy 3: Gather-based conversation (turn-taking, most compatible)
              const initialState: DemoCallState = {
                mode: "demo",
                history: [{ role: "assistant", content: greeting }],
                turn: 0,
              };

              const gatherResult = await gatherUsingSpeech(
                callInfo.callControlId,
                greeting,
                {
                  clientState: encodeDemoState(initialState),
                  speechTimeoutSecs: 5,
                  speechStartTimeoutSecs: 25,
                },
              );

              if ("error" in gatherResult) {
                log("warn", "telnyx_voice.demo_gather_failed", { error: gatherResult.error });

                // Strategy 4: Ultimate fallback — static TTS pitch
                await speakText(
                  callInfo.callControlId,
                  "Hey there! This is Sarah from Revenue Operator. I'm your AI phone agent demo. " +
                  "I'm having a brief technical hiccup connecting right now, but normally I'd be having " +
                  "a natural conversation with you — answering questions, booking appointments, and " +
                  "recovering revenue around the clock. Head to recall dash touch dot com to get started, or " +
                  "try this demo again in a moment. Thanks for checking us out!",
                  "female",
                );
              } else {
                log("info", "telnyx_voice.demo_gather_started", { callControlId: callInfo.callControlId });
              }
            }
          }
          break;
        }

        // ── Workspace calls: use voice AI system ──
        if (callInfo.callSessionId && resolvedWorkspaceId) {
          try {
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

      /* ──────────────────────────────────────────────────────────────────────
       * DEMO CONVERSATION: Gather-based loop (Strategy 3)
       * Telnyx fires this after caller finishes speaking in gather_using_speak.
       * ──────────────────────────────────────────────────────────────────── */
      case "call.gather.ended": {
        if (!callInfo.callControlId) break;

        // Extract speech/digits from gather result
        const gatherPayload = payload.data?.payload;

        // Check for result field (Telnyx may use different field names)
        const rawResult =
          gatherPayload?.speech?.result ??
          gatherPayload?.result ??
          gatherPayload?.digits ??
          "";

        // Decode demo state from client_state
        const gatherClientState = gatherPayload?.client_state ?? clientStateRaw;
        const gatherDemoState = gatherClientState ? decodeDemoState(gatherClientState) : demoState;

        if (!gatherDemoState || gatherDemoState.mode !== "demo") {
          log("info", "telnyx_voice.gather_ended_non_demo", { callControlId: callInfo.callControlId });
          break;
        }

        const callerSpeech = String(rawResult).trim();

        if (!callerSpeech) {
          // Caller was silent — prompt them with varied responses
          const silenceCount = gatherDemoState.turn;
          log("info", "telnyx_voice.demo_gather_silence", { callControlId: callInfo.callControlId, turn: gatherDemoState.turn, silenceCount });

          // After 3 silences, gracefully end the call
          if (silenceCount >= 3) {
            await speakText(
              callInfo.callControlId,
              "Seems like we might have a connection issue. Feel free to visit recall dash touch dot com anytime, or try the demo again. It was nice talking to you!",
              "female",
            );
            // Mark for hangup so call.speak.ended terminates the call
            const farewellState = demoCallStates.get(callInfo.callControlId);
            if (farewellState) {
              farewellState.isSpeaking = true;
              (farewellState as Record<string, unknown>).pendingHangup = true;
            }
            break;
          }

          const silencePrompt = gatherDemoState.turn === 0
            ? pickRandom(SILENCE_PROMPTS_INITIAL)
            : pickRandom(SILENCE_PROMPTS_ONGOING);

          const silenceState: DemoCallState = {
            mode: "demo",
            history: [...gatherDemoState.history, { role: "assistant", content: silencePrompt }],
            turn: gatherDemoState.turn + 1,
          };

          await gatherUsingSpeech(callInfo.callControlId, silencePrompt, {
            clientState: encodeDemoState(silenceState),
            speechTimeoutSecs: 5,
            speechStartTimeoutSecs: 25,
          });
          break;
        }

        log("info", "telnyx_voice.demo_gather_speech", {
          callControlId: callInfo.callControlId,
          speech: callerSpeech.slice(0, 120),
          turn: gatherDemoState.turn,
        });

        // Add user message to history
        const updatedHistory: ConversationMessage[] = [
          ...gatherDemoState.history,
          { role: "user", content: callerSpeech },
        ];

        // Generate AI response
        const aiResponse = await generateDemoResponse(updatedHistory);

        // Update history with AI response
        const newHistory: ConversationMessage[] = [
          ...updatedHistory,
          { role: "assistant", content: aiResponse },
        ];

        const newState: DemoCallState = {
          mode: "demo",
          history: newHistory,
          turn: gatherDemoState.turn + 1,
        };

        log("info", "telnyx_voice.demo_responding", {
          callControlId: callInfo.callControlId,
          response: aiResponse.slice(0, 120),
          turn: newState.turn,
        });

        // Check if caller is ending the conversation
        const isGoodbye = /\b(bye|goodbye|hang up|end|thanks|thank you|that's all|that's it|no more|gotta go|take care)\b/i.test(callerSpeech);

        if (isGoodbye && newState.turn > 1) {
          // Speak final message without gathering — let the call end naturally
          await speakText(callInfo.callControlId, aiResponse, "female");
        } else {
          // Continue the conversation loop
          await gatherUsingSpeech(callInfo.callControlId, aiResponse, {
            clientState: encodeDemoState(newState),
            speechTimeoutSecs: 5,
            speechStartTimeoutSecs: 25,
          });
        }

        break;
      }

      /* ──────────────────────────────────────────────────────────────────────
       * DEMO CONVERSATION: Transcription-based loop (Strategy 2)
       * Telnyx fires this with real-time speech transcription.
       * ──────────────────────────────────────────────────────────────────── */
      case "call.transcription": {
        if (!callInfo.callControlId) break;

        const rawPayload = payload.data?.payload;
        const transcriptionData = rawPayload?.transcription_data;
        const transcript = transcriptionData?.transcript ?? "";
        const isFinal = transcriptionData?.is_final === true;

        if (!transcript || !isDemoCall) break;

        const memState = demoCallStates.get(callInfo.callControlId);
        if (!memState) break;

        // Accumulate partial results
        if (!isFinal) {
          memState.pendingUtterance = transcript;
          memState.lastTranscriptionAt = Date.now();
          break;
        }

        // Final transcription — the caller finished an utterance
        const fullUtterance = (transcript || memState.pendingUtterance).trim();
        memState.pendingUtterance = "";

        if (!fullUtterance || memState.isSpeaking) {
          // Ignore transcription while AI is speaking (crosstalk)
          break;
        }

        log("info", "telnyx_voice.demo_transcription_utterance", {
          callControlId: callInfo.callControlId,
          utterance: fullUtterance.slice(0, 120),
          turn: memState.turn,
        });

        // Add to history and generate response
        memState.history.push({ role: "user", content: fullUtterance });
        memState.isSpeaking = true;
        memState.turn++;
        memState.silenceCount = 0; // Reset silence count on speech

        const transcriptionResponse = await generateDemoResponse(memState.history);
        memState.history.push({ role: "assistant", content: transcriptionResponse });

        // Keep history manageable — retain more context for better conversations
        if (memState.history.length > 16) {
          memState.history = memState.history.slice(-14);
        }

        log("info", "telnyx_voice.demo_transcription_responding", {
          callControlId: callInfo.callControlId,
          response: transcriptionResponse.slice(0, 120),
          turn: memState.turn,
        });

        // Speak the response
        await speakText(callInfo.callControlId, transcriptionResponse, "female");

        break;
      }

      /* ──────────────────────────────────────────────────────────────────────
       * SPEAK ENDED: Used in transcription mode to resume listening
       * ──────────────────────────────────────────────────────────────────── */
      case "call.speak.ended": {
        log("info", "telnyx_voice.speak_ended", { sessionId: callInfo.callSessionId, callControlId: callInfo.callControlId });

        // In transcription mode, mark that AI is done speaking so we process next utterance
        if (callInfo.callControlId && isDemoCall) {
          const speakMemState = demoCallStates.get(callInfo.callControlId);
          if (speakMemState) {
            // If farewell was spoken after repeated silence, hang up the call
            if ((speakMemState as Record<string, unknown>).pendingHangup) {
              log("info", "telnyx_voice.farewell_hangup", { callControlId: callInfo.callControlId });
              await hangupCall(callInfo.callControlId);
              break;
            }
            speakMemState.isSpeaking = false;
          }
        }

        break;
      }

      case "call.hangup": {
        log("info", "telnyx_voice.call_hangup", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId, isDemoCall });

        // Clean up demo call state and update lead
        if (callInfo.callControlId) {
          const hangupMemState = demoCallStates.get(callInfo.callControlId);
          if (hangupMemState) {
            const callDurationSecs = Math.round((Date.now() - hangupMemState.callStartedAt) / 1000);

            // Update lead status based on engagement (non-blocking)
            updateDemoLeadOnHangup(
              hangupMemState.callerPhone,
              hangupMemState.turn,
              callDurationSecs,
            ).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });

            log("info", "telnyx_voice.demo_call_completed", {
              callControlId: callInfo.callControlId,
              turns: hangupMemState.turn,
              durationSecs: callDurationSecs,
              historyLength: hangupMemState.history.length,
            });
          }
          demoCallStates.delete(callInfo.callControlId);
        }

        // Also try to update lead for gather-mode calls (no in-memory state)
        if (isDemoCall && callInfo.to) {
          const gatherTurn = demoState?.turn ?? 0;
          if (gatherTurn > 0) {
            updateDemoLeadOnHangup(callInfo.to, gatherTurn, 0).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
          }
        }

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

        // For voicemail machines on demo calls, leave a compelling message
        if (machineType === "machine_start" && isDemoCall && callInfo.callControlId) {
          await speakText(
            callInfo.callControlId,
            "Hey there! This is Sarah from Revenue Operator. We got your demo request, but it looks like I got your voicemail. " +
            "Revenue Operator is an AI phone agent that answers your business calls twenty-four seven, books appointments, and makes sure you never miss a customer again. " +
            "Head to recall dash touch dot com to try it free for fourteen days. Talk soon!",
            "female",
          );
        }
        break;
      }

      case "call.machine.greeting.ended": {
        // Voicemail greeting finished — the AI can now leave a message
        log("info", "telnyx_voice.machine_greeting_ended", { sessionId: callInfo.callSessionId, workspaceId: resolvedWorkspaceId });
        // Voice server is already streaming — it will naturally speak after the beep
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
      // stack trace logged server-side only, never returned in JSON response
      eventType,
    });
  }

  return NextResponse.json({ ok: true });
}
