/**
 * Telnyx webhook verification and event parsing.
 * Verifies webhook signatures and parses event payloads.
 */

import crypto from "crypto";

export type TelnyxEventType =
  | "call.initiated"
  | "call.answered"
  | "call.hangup"
  | "call.machine.detected"
  | "call.machine.greeting.ended"
  | "call.speak.ended"
  | "call.dtmf.received"
  | "call.streaming.started"
  | "call.streaming.stopped"
  | "call.bridged"
  | "call.refer.completed"
  | "call.recording.saved"
  | "message.delivered"
  | "message.sent"
  | "message.failed"
  | "number.ordered"
  | "number.provisioned"
  | "number.released";

export interface TelnyxWebhookPayload {
  id?: string;
  type?: string;
  event_type?: TelnyxEventType;
  data?: {
    record?: {
      id?: string;
      call_session_id?: string;
      call_leg_id?: string;
      state?: string;
      to?: string;
      from?: string;
      created_at?: string;
      call_control_id?: string;
      direction?: "incoming" | "outgoing" | string;
      message_id?: string;
      to_number?: string;
      from_number?: string;
      text?: string;
      status?: string;
      parts?: number;
      errors?: Array<{ code?: string; message?: string }>;
    };
  };
}

/**
 * Verify Telnyx webhook signature using HMAC-SHA256.
 * SECURITY: Never skip verification — always reject if key is missing.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyTelnyxWebhook(
  payload: string,
  signature: string | undefined,
  publicKey?: string
): boolean {
  // If no signature provided, ALWAYS fail
  if (!signature) {
    return false;
  }

  const key = publicKey || process.env.TELNYX_PUBLIC_KEY;
  if (!key) {
    // SECURITY: Never allow unverified webhooks, even in dev
    return false;
  }

  try {
    const expected = crypto
      .createHmac("sha256", key)
      .update(payload)
      .digest("base64");

    // Timing-safe comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expected, "base64"),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

/**
 * Parse Telnyx webhook event and extract event type and payload.
 */
export function parseTelnyxEvent(
  payload: TelnyxWebhookPayload
): { eventType: TelnyxEventType | null; data: TelnyxWebhookPayload["data"] } {
  const eventType = (payload.event_type || payload.type) as TelnyxEventType | null;
  const data = payload.data;

  return { eventType, data };
}

/**
 * Extract call information from webhook payload.
 */
export function extractCallInfo(payload: TelnyxWebhookPayload): {
  callControlId?: string;
  callSessionId?: string;
  from?: string;
  to?: string;
  state?: string;
} | null {
  const record = payload.data?.record;
  if (!record) return null;

  return {
    callControlId: record.call_control_id || record.id,
    callSessionId: record.call_session_id || record.call_leg_id,
    from: record.from,
    to: record.to,
    state: record.state,
  };
}

/**
 * Extract message information from webhook payload.
 */
export function extractMessageInfo(payload: TelnyxWebhookPayload): {
  messageId?: string;
  from?: string;
  to?: string;
  text?: string;
  status?: string;
  parts?: number;
  errors?: Array<{ code?: string; message?: string }>;
} | null {
  const record = payload.data?.record;
  if (!record) return null;

  return {
    messageId: record.message_id || record.id,
    from: record.from_number || record.from,
    to: record.to_number || record.to,
    text: record.text,
    status: record.status,
    parts: record.parts,
    errors: record.errors,
  };
}

/**
 * Check if webhook event is a call-related event.
 */
export function isCallEvent(eventType: TelnyxEventType | null): boolean {
  if (!eventType) return false;
  return eventType.startsWith("call.");
}

/**
 * Check if webhook event is a messaging-related event.
 */
export function isMessageEvent(eventType: TelnyxEventType | null): boolean {
  if (!eventType) return false;
  return eventType.startsWith("message.");
}

/**
 * Check if webhook event is a number-related event.
 */
export function isNumberEvent(eventType: TelnyxEventType | null): boolean {
  if (!eventType) return false;
  return eventType.startsWith("number.");
}
