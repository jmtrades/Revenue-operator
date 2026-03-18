/**
 * Voice webhook: Receives conversation summaries from the Python voice server
 * after every call ends. Persists transcript, metrics, and quality data to Supabase.
 * Also handles tool call results (appointments, lead captures, etc).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { createHmac } from "crypto";

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
    console.warn(
      "[voice-webhook] VOICE_WEBHOOK_SECRET not configured, skipping signature verification"
    );
    return true;
  }

  const expected = createHmac("sha256", secret)
    .update(body, "utf-8")
    .digest("hex");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  // Verify webhook signature
  const signature = req.headers.get("x-voice-webhook-signature");
  const body = await req.text();

  if (!verifyWebhookSignature(body, signature ?? "")) {
    console.error("[voice-webhook] Invalid signature");
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

  try {
    // 1. Find and update the call_session record
    const { data: callSession } = await db
      .from("call_sessions")
      .select("id")
      .eq("workspace_id", payload.workspace_id)
      .eq("external_meeting_id", payload.call_sid)
      .maybeSingle();

    if (callSession) {
      callSessionId = (callSession as { id: string }).id;

      // Update call_sessions with duration, outcome, and transcript metadata
      const updateData: Record<string, unknown> = {
        call_ended_at: new Date().toISOString(),
        duration_seconds: payload.duration_seconds,
        outcome: payload.outcome,
        metadata: {
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
        console.error(
          "[voice-webhook] Failed to update call_session:",
          updateError
        );
      }
    } else {
      console.warn(
        `[voice-webhook] call_session not found for call_sid: ${payload.call_sid}`
      );
    }
  } catch (err) {
    console.error(
      "[voice-webhook] Error updating call_session:",
      err instanceof Error ? err.message : err
    );
  }

  try {
    // 2. Insert voice_usage record
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
      console.error("[voice-webhook] Failed to insert voice_usage:", usageError);
    }
  } catch (err) {
    console.error(
      "[voice-webhook] Error inserting voice_usage:",
      err instanceof Error ? err.message : err
    );
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
      console.error(
        "[voice-webhook] Failed to insert voice_quality_logs:",
        qualityError
      );
    }
  } catch (err) {
    console.error(
      "[voice-webhook] Error inserting voice_quality_logs:",
      err instanceof Error ? err.message : err
    );
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
                    state: "QUALIFIED",
                    metadata: {
                      appointment_booked_at: new Date().toISOString(),
                      appointment_date: appointmentDate,
                      appointment_time: appointmentTime,
                    },
                  })
                  .eq("id", leadId);

                // Create appointment record if appointments table exists
                try {
                  await db.from("appointments").insert({
                    workspace_id: payload.workspace_id,
                    lead_id: leadId,
                    scheduled_at: `${appointmentDate}T${appointmentTime}`,
                    source: "voice_call",
                    call_session_id: callSessionId,
                    status: "scheduled",
                  });
                } catch {
                  // appointments table may not exist, that's okay
                }
              }
            }
          }
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
            }
          }
        }
      } catch (toolErr) {
        console.error(
          `[voice-webhook] Failed to process tool call ${toolCall.name}:`,
          toolErr instanceof Error ? toolErr.message : toolErr
        );
      }
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
