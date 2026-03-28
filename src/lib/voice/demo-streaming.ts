/**
 * Demo call streaming bridge.
 * Routes demo calls through the Recall Voice streaming server
 * instead of TwiML <Gather>+<Say> turn-taking.
 *
 * When VOICE_SERVER_URL is configured, demo calls get:
 * - Sub-800ms response latency (vs 3-4s with TwiML)
 * - True interruption handling (barge-in)
 * - Natural backchannel responses ("mhm", "right")
 * - Real-time audio streaming via WebSocket
 *
 * Falls back to TwiML approach when voice server is unavailable.
 */

import { getVoiceProvider } from "@/lib/voice";
import { DEMO_SYSTEM_PROMPT } from "@/lib/voice/demo-agent";
import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

/** Check if the streaming voice server is available */
export function isStreamingAvailable(): boolean {
  return Boolean(
    process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL
  );
}

/**
 * A/B test routing: deterministically routes 50% of calls to streaming.
 * Uses a simple hash of the session ID for consistent assignment.
 */
export function shouldUseStreaming(callSessionId: string): boolean {
  if (!isStreamingAvailable()) return false;

  // If AB_TEST_STREAMING env var is set to "off", always use TwiML
  // If set to "all", always use streaming (for when streaming wins the test)
  const abMode = process.env.AB_TEST_STREAMING ?? "split";
  if (abMode === "off") return false;
  if (abMode === "all") return true;

  // Deterministic 50/50 split based on session ID hash
  let hash = 0;
  for (let i = 0; i < callSessionId.length; i++) {
    hash = ((hash << 5) - hash + callSessionId.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 100) < 50;
}

/**
 * Create a streaming demo call session.
 * Returns TwiML with <Connect><Stream> for real-time voice.
 *
 * @param callSessionId - Pre-created call session UUID
 * @param leadPhone - Caller's phone (for context carryover)
 * @param workspaceId - Demo workspace ID
 * @returns TwiML string with streaming config, or null if streaming unavailable
 */
export async function createStreamingDemoCall(
  callSessionId: string,
  leadPhone: string,
  workspaceId: string,
): Promise<string | null> {
  if (!isStreamingAvailable()) {
    log("info", "demo_streaming.not_available", {
      reason: "no_voice_server_url",
    });
    return null;
  }

  try {
    const voice = getVoiceProvider();
    const db = getDb();

    // Load any prior conversation context for this lead (context carryover)
    let priorContext = "";
    try {
      const { data: lead } = await db
        .from("leads")
        .select("id, name, metadata")
        .eq("workspace_id", workspaceId)
        .eq("phone", leadPhone)
        .maybeSingle();

      if (lead) {
        const leadData = lead as {
          id: string;
          name?: string;
          metadata?: Record<string, unknown>;
        };
        const meta = leadData.metadata ?? {};
        const summary = meta.last_call_summary as string | undefined;
        const name = leadData.name;

        if (summary || name) {
          priorContext = "\n\n## RETURNING CALLER CONTEXT\n";
          if (name) priorContext += `Caller's name: ${name}\n`;
          if (summary)
            priorContext += `Previous conversation summary: ${summary}\n`;
          priorContext +=
            "Use this context naturally — welcome them back, reference what you discussed before.\n";
        }
      }
    } catch (ctxErr) {
      log("warn", "demo_streaming.context_load_failed", {
        error:
          ctxErr instanceof Error ? ctxErr.message : String(ctxErr),
      });
    }

    // Build the demo system prompt with any prior context
    const systemPrompt = DEMO_SYSTEM_PROMPT + priorContext;

    // Create the streaming assistant
    const { assistantId } = await voice.createAssistant({
      name: `Demo – ${callSessionId.slice(0, 8)}`,
      systemPrompt,
      voiceId: process.env.DEMO_VOICE_ID || "us-female-warm-receptionist",
      voiceProvider: "deepgram-aura",
      language: "en",
      tools: [],
      maxDuration: 900, // 15-minute max for demo calls
      silenceTimeout: 30,
      backgroundDenoising: true,
      metadata: {
        workspace_id: workspaceId,
        direction: "outbound",
        call_type: "demo",
        call_session_id: callSessionId,
        business_name: "Recall Touch",
        industry: "ai_saas",
      },
    });

    // Get TwiML with <Connect><Stream> pointing to voice server WebSocket
    const twiml = await voice.createInboundCall(callSessionId, assistantId);

    // Mark session as streaming demo
    try {
      await db
        .from("call_sessions")
        .update({
          metadata: {
            is_demo: true,
            streaming: true,
            ab_variant: "streaming",
            assistant_id: assistantId,
            demo_started_at: new Date().toISOString(),
          },
        })
        .eq("id", callSessionId);
    } catch (dbErr) {
      log("warn", "demo_streaming.session_update_failed", {
        error:
          dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    }

    log("info", "demo_streaming.created", {
      callSessionId,
      assistantId,
      hasContext: priorContext.length > 0,
    });

    return twiml;
  } catch (err) {
    log("error", "demo_streaming.failed", {
      error: err instanceof Error ? err.message : String(err),
      callSessionId,
    });
    return null; // Caller should fall back to TwiML approach
  }
}

/**
 * Mark a call session as using the TwiML (non-streaming) variant.
 * Called from the demo webhook when streaming is skipped.
 */
export async function markTwimlVariant(callSessionId: string): Promise<void> {
  try {
    const db = getDb();
    // Merge ab_variant into existing metadata (don't overwrite)
    const { data: session } = await db
      .from("call_sessions")
      .select("metadata")
      .eq("id", callSessionId)
      .maybeSingle();
    const existing = ((session as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    await db
      .from("call_sessions")
      .update({
        metadata: {
          ...existing,
          streaming: false,
          ab_variant: "twiml",
        },
      })
      .eq("id", callSessionId);
  } catch (err) {
    log("warn", "demo_streaming.mark_twiml_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
