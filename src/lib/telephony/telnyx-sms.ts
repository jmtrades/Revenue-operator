/**
 * Telnyx SMS/messaging API functions.
 * Sends SMS and other text messages via Telnyx Messaging API.
 */

import { telnyxRequest } from "./telnyx-client";

export interface SendSmsParams {
  from: string;
  to: string;
  text: string;
  messagingProfileId?: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
}

export interface SmsResponse {
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      id?: string;
      to?: string[];
      from?: string;
      text?: string;
      parts?: number;
      direction?: string;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
}

/**
 * Send SMS via Telnyx Messaging API.
 * Returns messageId and status on success.
 */
export async function sendSms(
  params: SendSmsParams
): Promise<{ messageId: string; status: string } | { error: string }> {
  try {
    const messagingProfileId = params.messagingProfileId || process.env.TELNYX_MESSAGING_PROFILE_ID;

    const body = {
      to: params.to,
      from: params.from,
      text: params.text,
      ...(messagingProfileId && { messaging_profile_id: messagingProfileId }),
      ...(params.webhookUrl && { webhook_url: params.webhookUrl }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    const response = await telnyxRequest<SmsResponse>("/messages", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const messageId = response.data?.attributes?.id || response.data?.id || "unknown";
    const status = response.data?.attributes?.status || "queued";

    return { messageId, status };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Get SMS/message details by ID.
 */
export async function getSmsDetails(
  messageId: string
): Promise<{ status: string; to: string; from: string } | { error: string }> {
  try {
    const response = await telnyxRequest<SmsResponse>(`/messages/${messageId}`, {
      method: "GET",
    });

    const attributes = response.data?.attributes;
    if (!attributes) {
      return { error: "Message not found" };
    }

    return {
      status: attributes.status || "unknown",
      to: (attributes.to?.[0] || "").toString(),
      from: attributes.from || "",
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}
