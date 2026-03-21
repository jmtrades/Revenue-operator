/**
 * Telnyx Voice API functions using Call Control API.
 * Manages outbound calls, call state transitions, and media streaming.
 */

import { telnyxRequest, parseTelnyxError } from "./telnyx-client";

export interface CreateOutboundCallParams {
  from: string;
  to: string;
  connectionId: string;
  webhookUrl: string;
  answeringMachineDetection?: "disabled" | "premium" | "standard";
  customHeaders?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface OutboundCallResponse {
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      id?: string;
      call_session_id?: string;
      call_leg_id?: string;
      to?: string;
      from?: string;
      state?: string;
      direction?: string;
      created_at?: string;
    };
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
    };

    const response = await telnyxRequest<OutboundCallResponse>("/calls", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const callId = response.data?.attributes?.call_session_id || response.data?.id || "";
    const callSessionId =
      response.data?.attributes?.call_session_id ||
      response.data?.attributes?.call_leg_id ||
      "";

    if (!callId || !callSessionId) {
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

    const attributes = response.data?.attributes;
    if (!attributes) {
      return { error: "Call not found" };
    }

    return {
      state: attributes.state || "unknown",
      to: attributes.to || "",
      from: attributes.from || "",
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
  voiceType: "male" | "female" = "female"
): Promise<{ success: boolean } | { error: string }> {
  try {
    await telnyxRequest(`/calls/${callControlId}/actions/speak`, {
      method: "POST",
      body: JSON.stringify({
        payload: text,
        voice: voiceType === "male" ? "male" : "female",
        language: "en-US",
      }),
    });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}
