/**
 * Telnyx Voice API functions using Call Control API.
 * Manages outbound calls, call state transitions, and media streaming.
 */

import { telnyxRequest } from "./telnyx-client";

/**
 * Retry wrapper for idempotent Telnyx operations.
 * Retries up to `maxRetries` times with exponential backoff.
 * Only retries on network errors and 5xx status codes.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 300,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      const statusCode = (lastError as Error & { status?: number }).status;
      // Only retry on transient errors (network, timeout, 5xx)
      const isRetryable =
        msg.includes("fetch failed") ||
        msg.includes("timeout") ||
        msg.includes("econnreset") ||
        msg.includes("socket hang up") ||
        (typeof statusCode === "number" && statusCode >= 500 && statusCode < 600) ||
        msg.includes("service unavailable") ||
        msg.includes("bad gateway") ||
        msg.includes("gateway timeout");
      if (!isRetryable || attempt === maxRetries) throw lastError;
      // Exponential backoff: 300ms, 600ms
      await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastError!;
}

export interface CreateOutboundCallParams {
  from: string;
  to: string;
  connectionId: string;
  webhookUrl: string;
  answeringMachineDetection?: "disabled" | "premium" | "standard";
  customHeaders?: Record<string, string>;
  metadata?: Record<string, unknown>;
  /** Base64-encoded client state passed through to webhook events */
  clientState?: string;
}

export interface OutboundCallResponse {
  data?: {
    id?: string;
    record_type?: string;
    call_control_id?: string;
    call_session_id?: string;
    call_leg_id?: string;
    to?: string;
    from?: string;
    state?: string;
    direction?: string;
    is_alive?: boolean;
    created_at?: string;
  };
}

/**
 * Create an outbound call via Telnyx Call Control API.
 */
export async function createOutboundCall(
  params: CreateOutboundCallParams
): Promise<{ callId: string; callSessionId: string } | { error: string }> {
  try {
    const body = {
      to: params.to,
      from: params.from,
      connection_id: params.connectionId,
      webhook_url: params.webhookUrl,
      webhook_url_method: "POST",
      answering_machine_detection: params.answeringMachineDetection || "disabled",
      ...(params.customHeaders && { custom_headers: params.customHeaders }),
      ...(params.metadata && { metadata: params.metadata }),
      ...(params.clientState && { client_state: params.clientState }),
    };

    const response = await withRetry(() =>
      telnyxRequest<OutboundCallResponse>("/calls", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

    const d = response.data;
    const callId = d?.call_control_id || d?.call_session_id || d?.id || "";
    const callSessionId = d?.call_session_id || d?.call_leg_id || d?.id || "";

    if (!callId) {
      return { error: "No call ID returned from Telnyx" };
    }

    return { callId, callSessionId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Answer an incoming call.
 */
export async function answerCall(
  callControlId: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    await telnyxRequest(`/calls/${callControlId}/actions/answer`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Hang up / disconnect a call.
 */
export async function hangupCall(
  callControlId: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    await telnyxRequest(`/calls/${callControlId}/actions/hangup`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Start audio streaming (e.g., to a server or WebSocket).
 */
export async function startStreamingAudio(
  callControlId: string,
  streamUrl: string,
  streamType: "bidirectional" | "receive_only" = "bidirectional"
): Promise<{ success: boolean } | { error: string }> {
  try {
    await telnyxRequest(`/calls/${callControlId}/actions/streaming_start`, {
      method: "POST",
      body: JSON.stringify({
        stream_url: streamUrl,
        stream_type: streamType,
      }),
    });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Stop audio streaming.
 */
export async function stopStreamingAudio(
  callControlId: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    await telnyxRequest(`/calls/${callControlId}/actions/streaming_stop`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Get call status/details.
 */
export async function getCallStatus(
  callControlId: string
): Promise<{ state: string; to: string; from: string } | { error: string }> {
  try {
    const response = await telnyxRequest<OutboundCallResponse>(
      `/calls/${callControlId}`,
      {
        method: "GET",
      }
    );

    const d = response.data;
    if (!d) {
      return { error: "Call not found" };
    }

    return {
      state: d.state || "unknown",
      to: d.to || "",
      from: d.from || "",
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Play audio (speak text) on a call via text-to-speech.
 */
export async function speakText(
  callControlId: string,
  text: string,
  voiceType: "male" | "female" = "female",
  clientState?: string,
): Promise<{ success: boolean } | { error: string }> {
  try {
    await withRetry(() =>
      telnyxRequest(`/calls/${callControlId}/actions/speak`, {
        method: "POST",
        body: JSON.stringify({
          payload: text,
          voice: voiceType === "male" ? "male" : "female",
          language: "en-US",
          ...(clientState && { client_state: clientState }),
        }),
      }),
    );

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Speak text and then gather speech input from the caller.
 * Uses Telnyx gather_using_speak with speech recognition.
 * When the caller finishes speaking, Telnyx fires call.gather.ended webhook.
 */
export async function gatherUsingSpeech(
  callControlId: string,
  text: string,
  options?: {
    voiceType?: "male" | "female";
    clientState?: string;
    /** Max seconds of silence before ending gather (default 3) */
    speechTimeoutSecs?: number;
    /** Max seconds to wait for caller to start speaking (default 15) */
    speechStartTimeoutSecs?: number;
  },
): Promise<{ success: boolean } | { error: string }> {
  const voiceType = options?.voiceType ?? "female";
  const speechTimeout = options?.speechTimeoutSecs ?? 3;
  const startTimeout = options?.speechStartTimeoutSecs ?? 15;

  try {
    await withRetry(() =>
      telnyxRequest(
        `/calls/${callControlId}/actions/gather_using_speak`,
        {
          method: "POST",
          body: JSON.stringify({
            payload: text,
            voice: voiceType === "male" ? "male" : "female",
            language: "en-US",
            // Minimum 1 digit prevents immediate DTMF termination
            minimum_digits: 1,
            maximum_digits: 128,
            // Long timeout to let the caller speak
            inter_digit_timeout: startTimeout,
            timeout_millis: (startTimeout + speechTimeout) * 1000,
            ...(options?.clientState && { client_state: options.clientState }),
          }),
        },
      ),
    );

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Start real-time transcription on a call.
 * Telnyx will send call.transcription webhook events.
 */
export async function startTranscription(
  callControlId: string,
  options?: {
    language?: string;
    clientState?: string;
    /** Which audio track to transcribe: inbound (caller), outbound (agent), or both */
    transcriptionTracks?: "inbound" | "outbound" | "both";
  },
): Promise<{ success: boolean } | { error: string }> {
  try {
    await telnyxRequest(
      `/calls/${callControlId}/actions/transcription_start`,
      {
        method: "POST",
        body: JSON.stringify({
          language: options?.language ?? "en",
          transcription_tracks: options?.transcriptionTracks ?? "inbound",
          ...(options?.clientState && { client_state: options.clientState }),
        }),
      },
    );

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Stop real-time transcription on a call.
 */
export async function stopTranscription(
  callControlId: string,
): Promise<{ success: boolean } | { error: string }> {
  try {
    await telnyxRequest(
      `/calls/${callControlId}/actions/transcription_stop`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}
