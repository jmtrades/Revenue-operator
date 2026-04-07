/**
 * Voice webhook: Receives conversation summaries from the Python voice server
 * after every call ends. Persists transcript, metrics, and quality data to Supabase.
 * Also handles tool call results (appointments, lead captures, etc).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { createHmac, timingSafeEqual } from "crypto";
import { log } from "@/lib/logger";

interface Transcript {
  timestamp: number;
  speaker: "assistant" | "user";
  text: string;
  confidence: number | null;
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: "success" | "failed" | string;
}

interface QualityMetrics {
  avg_ttfb_ms: number;
  max_ttfb_ms: number;
  barge_in_count: number;
  error_count: number;
  user_sentiment: "positive" | "neutral" | "negative" | string;
}

interface UsageMetrics {
  total_tts_chars: number;
  total_tts_duration_ms: number;
  total_stt_duration_ms: number;
  tts_calls: number;
  stt_calls: number;
}

interface VoiceWebhookBody {
  event: string;
  conversation_id: string;
  call_sid: string;
  workspace_id: string;
  voice_id: string;
  tts_model: string;
  duration_seconds: number;
  outcome: "completed" | "failed" | "no_answer" | "voicemail";
  transcript: Transcript[];
  tool_calls: ToolCall[];
  quality_metrics: QualityMetrics;
  usage: UsageMetrics;
}

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.VOICE_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed in ANY deployed environment — only skip locally (no VERCEL_ENV at all).
    const isDeployed = Boolean(process.env.VERCEL_ENV) || process.env.NODE_ENV === "production";
    if (isDeployed) {
      log("error", "voice_webhook.secret_not_configured", {
        message: "rejecting webhook — VOICE_WEBHOOK_SECRET must be set in all deployed environments",
        vercel_env: process.env.VERCEL_ENV ?? "unset",
      });
      return false;
    }
    log("warn", "voice_webhook.secret_not_configured", { message: "skipping signature verification in local development only" });
    return true;
  }

  const expected = createHmac("sha256", secret)
    .update(body, "utf-8")
    .digest("hex");
  // Timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf-8"), Buffer.from(signature, "utf-8"));
  } catch {
    return expected === signature;
  }
}

export async function POST(req: NextRequest) {
  // No CSRF check — this endpoint receives external webhooks from the voice server.
  // Security is enforced via HMAC signature verification below.

  // Verify webhook signature
  const signature = req.headers.get("x-voice-webhook-signature");
  const body = await req.text();

  if (!verifyWebhookSignature(body, signature ?? "")) {
    log("error", "voice_webhook.invalid_signature", { message: "signature verification failed" });
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: VoiceWebhookBody;
  try {
    payload = JSON.parse(body) as VoiceWebhookBody;
  } catch {
    return new NextResponse(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = getDb();
  let callSessionId: string | null = null;

  // Validate workspace_id is a plausible UUID to prevent injection
  if (!payload.workspace_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.workspace_id)) {
    log("error", "voice_webhook.invalid_workspace_id", { workspace_id: payload.workspace_id });
    return new NextResponse(JSON.stringify({ error: "Invalid workspace_id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    // 1. Find the call_session by call_sid and cross-verify workspace ownership
    const { data: callSession } = await db
      .from("call_sessions")
      .select("id, workspace_id, metadata")
      .eq("external_meeting_id", payload.call_sid)
      .maybeSingle();

    // Cross-verify: the call_session's workspace must match the payload's workspace_id
    if (callSession && (callSession as { workspace_id?: string }).workspace_id !== payload.workspace_id) {
      log("error", "voice_webhook.workspace_mismatch", {
        call_sid: payload.call_sid,
        expected: (callSession as { workspace_id?: string }).workspace_id,
        received: payload.workspace_id,
      });
      return new NextResponse(JSON.stringify({ error: "Workspace mismatch" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    if (callSession) {
      const callSessionRow = callSession as { id: string; metadata?: Record<string, unknown> | null };
      callSessionId = callSessionRow.id;

      const existingMetadata = (callSessionRow.metadata ?? {}) as Record<string, unknown>;
      const isTestCall =
        existingMetadata.test_call === true || existingMetadata.is_test_call === true;
      const testAgentId = typeof existingMetadata.agent_id === "string" ? existingMetadata.agent_id : null;

      // Update call_sessions with duration, outcome, and transcript metadata
      const updateData: Record<string, unknown> = {
        call_ended_at: new Date().toISOString(),
        duration_seconds: payload.duration_seconds,
        outcome: payload.outcome,
        // Quality metrics (best-effort from voice webhook payload)
        answer_latency_ms: null,
        avg_response_latency_ms: payload.quality_metrics.avg_ttfb_ms,
        interruption_count: payload.quality_metrics.barge_in_count,
        fallback_events: [],
        cost_cents: null,
        stt_model: null,
        tts_model: payload.tts_model,
        llm_model: null,
        metadata: {
          ...existingMetadata,
          transcript: payload.transcript,
          quality_metrics: payload.quality_metrics,
          usage: payload.usage,
          voice_id: payload.voice_id,
          tts_model: payload.tts_model,
        },
      };

      const { error: updateError } = await db
        .from("call_sessions")
        .update(updateData)
        .eq("id", callSessionId);

      if (updateError) {
        log("error", "voice_webhook.call_session_update_failed", { error: String(updateError) });
      }

      // If this was a test call and it finished successfully, unblock agent go-live.
      if (isTestCall && payload.outcome === "completed" && testAgentId) {
        await db
          .from("agents")
          .update({ test_call_completed: true, updated_at: new Date().toISOString() })
          .eq("id", testAgentId);
      }
    } else {
      log("warn", "voice_webhook.call_session_not_found", { call_sid: payload.call_sid });
    }
  } catch (err) {
    log("error", "voice_webhook.call_session_update_error", { error: err instanceof Error ? err.message : String(err) });
  }

  try {
    // 2. Insert voice_usage record (only if we found a valid call session)
    if (!callSessionId) {
      log("warn", "voice_webhook.skipping_usage_insert", { reason: "no call_session found", call_sid: payload.call_sid });
    }
    const { error: usageError } = await db.from("voice_usage").insert({
      workspace_id: payload.workspace_id,
      call_session_id: callSessionId,
      voice_id: payload.voice_id,
      tts_model: payload.tts_model,
      input_chars: payload.usage.total_tts_chars,
      audio_duration_ms: payload.usage.total_tts_duration_ms,
      ttfb_ms: payload.quality_metrics.avg_ttfb_ms,
      total_latency_ms: payload.quality_metrics.max_ttfb_ms,
      was_streaming: true,
    });

    if (usageError) {
      log("error", "voice_webhook.voice_usage_insert_failed", { error: String(usageError) });
    }
  } catch (err) {
    log("error", "voice_webhook.voice_usage_insert_error", { error: err instanceof Error ? err.message : String(err) });
  }

  try {
    // 3. Insert voice_quality_logs record
    const { error: qualityError } = await db
      .from("voice_quality_logs")
      .insert({
        workspace_id: payload.workspace_id,
        call_session_id: callSessionId,
        voice_id: payload.voice_id,
        tts_model: payload.tts_model,
        avg_ttfb_ms: payload.quality_metrics.avg_ttfb_ms,
        max_ttfb_ms: payload.quality_metrics.max_ttfb_ms,
        barge_in_count: payload.quality_metrics.barge_in_count,
        error_count: payload.quality_metrics.error_count,
        user_sentiment: payload.quality_metrics.user_sentiment,
        call_duration_seconds: payload.duration_seconds,
        total_tts_calls: payload.usage.tts_calls,
        total_stt_calls: payload.usage.stt_calls,
      });

    if (qualityError) {
      log("error", "voice_webhook.quality_logs_insert_failed", { error: String(qualityError) });
    }

    // Score call quality using the quality library
    try {
      const { recordCallQuality } = await import("@/lib/voice/quality");
      await recordCallQuality({
        call_session_id: callSessionId || "unknown",
        answer_latency_ms: payload.quality_metrics.avg_ttfb_ms ?? 0,
        avg_response_latency_ms: payload.quality_metrics.avg_ttfb_ms ?? 0,
        interruption_count: payload.quality_metrics.barge_in_count ?? 0,
        fallback_events: [],
        cost_cents: 0,
        stt_model: "deepgram",
        tts_model: payload.tts_model ?? "unknown",
        llm_model: "claude-haiku-4-5-20251001",
      });
    } catch (qErr) {
      log("warn", "voice_webhook.quality_scoring_failed", { error: qErr instanceof Error ? qErr.message : String(qErr) });
    }
  } catch (err) {
    log("error", "voice_webhook.quality_logs_insert_error", { error: err instanceof Error ? err.message : String(err) });
  }

  // 4. Process tool calls (book_appointment, capture_lead, etc)
  if (payload.tool_calls && payload.tool_calls.length > 0) {
    for (const toolCall of payload.tool_calls) {
      try {
        if (toolCall.name === "book_appointment" && callSessionId) {
          // Extract appointment details from tool args
          const appointmentDate = toolCall.args.date as string | undefined;
          const appointmentTime = toolCall.args.time as string | undefined;

          if (appointmentDate && appointmentTime) {
            // Find the lead associated with this call
            const { data: callSessionData } = await db
              .from("call_sessions")
              .select("lead_id")
              .eq("id", callSessionId)
              .maybeSingle();

            if (callSessionData) {
              const leadId = (
                callSessionData as { lead_id?: string | null } | null
              )?.lead_id;

              if (leadId) {
                // Update lead status
                await db
                  .from("leads")
                  .update({
                    status: "QUALIFIED",
                    metadata: {
                      appointment_booked_at: new Date().toISOString(),
                      appointment_date: appointmentDate,
                      appointment_time: appointmentTime,
                    },
                  })
                  .eq("id", leadId);

                // Autonomous Brain: recompute intelligence after appointment booking
                void (async () => {
                  try {
                    const { computeLeadIntelligence, persistLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
                    const intelligence = await computeLeadIntelligence(payload.workspace_id, leadId);
                    await persistLeadIntelligence(intelligence);
                  } catch { /* Non-blocking */ }
                })();

                // Create appointment record — with idempotency check to prevent duplicate bookings
                try {
                  const { data: existingAppt } = await db
                    .from("appointments")
                    .select("id")
                    .eq("call_session_id", callSessionId)
                    .maybeSingle();
                  if (!existingAppt) {
                    await db.from("appointments").insert({
                      workspace_id: payload.workspace_id,
                      lead_id: leadId,
                      title: "Voice Call Booking",
                      start_time: `${appointmentDate}T${appointmentTime}`,
                      call_session_id: callSessionId,
                      status: "confirmed",
                    });
                  } else {
                    log("warn", "voice_webhook.duplicate_booking_prevented", { callSessionId, leadId });
                  }
                } catch {
                  // appointments table may not exist, that's okay
                }
              }
            }
          }
        } else if (toolCall.name === "search_knowledge" && callSessionId) {
          // Knowledge search was invoked during a call — log for analytics
          log("info", "voice_webhook.tool_search_knowledge", {
            callSessionId,
            query: typeof toolCall.args.query === "string" ? toolCall.args.query.slice(0, 100) : "",
            result: toolCall.result,
          });
        } else if (toolCall.name === "check_business_hours" && callSessionId) {
          // Business hours check was invoked — log for analytics
          log("info", "voice_webhook.tool_check_hours", {
            callSessionId,
            day: typeof toolCall.args.day === "string" ? toolCall.args.day : "today",
            result: toolCall.result,
          });
        } else if (
          toolCall.name === "capture_lead" &&
          callSessionId &&
          toolCall.result === "success"
        ) {
          // Find the lead and update with captured info
          const { data: callSessionData } = await db
            .from("call_sessions")
            .select("lead_id")
            .eq("id", callSessionId)
            .maybeSingle();

          if (callSessionData) {
            const leadId = (
              callSessionData as { lead_id?: string | null } | null
            )?.lead_id;

            if (leadId) {
              // Update lead with captured data
              const capturedData = toolCall.args as Record<string, unknown>;
              const updatePayload: Record<string, unknown> = {
                state: "QUALIFIED",
              };

              if (capturedData.name) updatePayload.name = capturedData.name;
              if (capturedData.email)
                updatePayload.email = capturedData.email;
              if (capturedData.phone)
                updatePayload.phone = capturedData.phone;
              if (capturedData.company)
                updatePayload.company = capturedData.company;

              await db.from("leads").update(updatePayload).eq("id", leadId);

              // Autonomous Brain: recompute intelligence after voice lead capture
              void (async () => {
                try {
                  const { computeLeadIntelligence, persistLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
                  const intelligence = await computeLeadIntelligence(payload.workspace_id, leadId);
                  await persistLeadIntelligence(intelligence);
                } catch { /* Non-blocking */ }
              })();
            }
          }
        }
      } catch (toolErr) {
        log("error", "voice_webhook.tool_call_process_failed", { tool_name: toolCall.name, error: toolErr instanceof Error ? toolErr.message : String(toolErr) });
      }
    }
  }

  // 5. Stop-on-reply: pause active follow-up sequences when a lead engages via call
  if (callSessionId && payload.outcome === "completed" && payload.duration_seconds > 10) {
    try {
      const { data: callSessionForLead } = await db
        .from("call_sessions")
        .select("lead_id")
        .eq("id", callSessionId)
        .maybeSingle();
      const leadId = (callSessionForLead as { lead_id?: string | null } | null)?.lead_id;
      if (leadId) {
        const { pauseOnLeadReply } = await import("@/lib/sequences/follow-up-engine");
        await pauseOnLeadReply(payload.workspace_id, leadId, "call_completed");
      }
    } catch (err) {
      log("warn", "voice_webhook.pause_on_reply_error", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return new NextResponse(
    JSON.stringify({
      ok: true,
      call_session_id: callSessionId,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
