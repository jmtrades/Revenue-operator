/**
 * Unified telephony service interface.
 * Automatically selects between Telnyx and Twilio based on TELEPHONY_PROVIDER.
 */

import { getTelephonyProvider } from "./get-telephony-provider";
import type {
  AvailableNumber,
  PurchasedNumber,
  SmsParams,
  SmsResult,
  CallParams,
  CallResult,
} from "./types";
import { sendSms as sendSmsTelnyx } from "./telnyx-sms";
import { searchAvailableNumbers as searchTelnyxNumbers, purchaseNumber as purchaseTelnyxNumber, releaseNumber as releaseTelnyxNumber } from "./telnyx-numbers";
import { createOutboundCall as createTelnyxCall } from "./telnyx-voice";

/**
 * TelephonyService provides a unified interface for SMS, voice calls, and number management.
 */
export interface TelephonyService {
  sendSms(params: SmsParams): Promise<SmsResult | { error: string }>;
  searchAvailableNumbers(params: {
    countryCode?: string;
    areaCode?: string;
    state?: string;
    phoneType?: "local" | "toll_free" | "mobile";
    limit?: number;
  }): Promise<AvailableNumber[] | { error: string }>;
  purchaseNumber(
    phoneNumberE164: string,
    options?: { connectionId?: string; messagingProfileId?: string }
  ): Promise<PurchasedNumber | { error: string }>;
  releaseNumber(numberId: string): Promise<{ success: boolean } | { error: string }>;
  createOutboundCall(params: CallParams): Promise<CallResult | { error: string }>;
}

/**
 * Create a Telnyx telephony service instance.
 */
function createTelnyxService(): TelephonyService {
  return {
    async sendSms(params: SmsParams) {
      const result = await sendSmsTelnyx({
        from: params.from,
        to: params.to,
        text: params.text,
        messagingProfileId: params.messagingProfileId,
      });

      if ("error" in result) {
        return result;
      }

      return {
        messageId: result.messageId,
        status: (result.status as SmsResult["status"]) || "queued",
      };
    },

    async searchAvailableNumbers(params) {
      const result = await searchTelnyxNumbers({
        countryCode: params.countryCode,
        areaCode: params.areaCode,
        state: params.state,
        phoneType: params.phoneType,
        limit: params.limit,
      });

      if ("error" in result) {
        return result;
      }

      return result.map((n) => ({
        phone_number: n.phone_number,
        friendly_name: n.phone_number,
        type: (params.phoneType || "local") as "local" | "toll_free" | "mobile",
        monthly_cost_cents: params.phoneType === "toll_free" ? 800 : 500,
        setup_fee_cents: 200,
        capabilities: n.capabilities,
      }));
    },

    async purchaseNumber(phoneNumberE164, options) {
      const result = await purchaseTelnyxNumber({
        phoneNumberE164,
        connectionId: options?.connectionId,
        messagingProfileId: options?.messagingProfileId,
      });

      if ("error" in result) {
        return result;
      }

      return {
        numberId: result.numberId,
        phoneNumber: result.phoneNumber,
        status: result.status,
      };
    },

    async releaseNumber(numberId: string) {
      return releaseTelnyxNumber(numberId);
    },

    async createOutboundCall(params: CallParams) {
      const connectionId = process.env.TELNYX_CONNECTION_ID;
      if (!connectionId) {
        return { error: "TELNYX_CONNECTION_ID not configured" };
      }

      const result = await createTelnyxCall({
        from: params.from,
        to: params.to,
        connectionId,
        webhookUrl: params.webhookUrl,
        metadata: params.metadata,
      });

      if ("error" in result) {
        return { error: result.error };
      }

      return {
        callId: result.callId,
        callSessionId: result.callSessionId,
        status: "queued" as const,
      };
    },
  };
}

/**
 * Create a Twilio telephony service instance.
 * Uses Twilio REST API with basic auth (no SDK dependency).
 */
function createTwilioService(): TelephonyService {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Helper: basic auth header for Twilio REST API
  const getTwilioAuth = (): string | null => {
    if (!accountSid || !authToken) return null;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    return `Basic ${credentials}`;
  };

  // Helper: fetch wrapper for Twilio API
  const twilioFetch = async (
    path: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const auth = getTwilioAuth();
    if (!auth) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN not configured");
    }
    const url = `https://api.twilio.com/2010-04-01${path}`;
    const headers = {
      "Authorization": auth,
      "Content-Type": "application/x-www-form-urlencoded",
      ...options.headers,
    };
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(15_000),
    });
    return response;
  };

  // Helper: parse Twilio error response
  const parseTwilioError = (data: unknown): string => {
    const errorData = data as {
      message?: string;
      code?: string;
      detail?: string;
      details?: string;
    };
    return errorData.message || errorData.detail || errorData.details || "Twilio API error";
  };

  return {
    async sendSms(params: SmsParams) {
      try {
        if (!accountSid || !authToken) {
          return { error: "Twilio not configured: missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN" };
        }

        const formData = new URLSearchParams();
        formData.append("From", params.from);
        formData.append("To", params.to);
        formData.append("Body", params.text);

        const response = await twilioFetch(`/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          body: formData.toString(),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as unknown;
          const errorMsg = parseTwilioError(errorData);
          return { error: errorMsg };
        }

        const data = (await response.json()) as {
          sid?: string;
          status?: string;
          [key: string]: unknown;
        };

        return {
          messageId: data.sid || "unknown",
          status: (data.status as SmsResult["status"]) || "queued",
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to send SMS via Twilio" };
      }
    },

    async searchAvailableNumbers(params) {
      try {
        if (!accountSid || !authToken) {
          return { error: "Twilio not configured" };
        }

        // Build query parameters for available numbers search
        const searchParams = new URLSearchParams();
        if (params.areaCode) {
          searchParams.append("AreaCode", params.areaCode);
        }
        if (params.state) {
          searchParams.append("Region", params.state);
        }
        if (params.limit) {
          searchParams.append("Limit", String(params.limit));
        }

        // Map phoneType to Twilio SMS/Voice capabilities
        const type = params.phoneType || "local";
        searchParams.append("SmsEnabled", "true");
        searchParams.append("VoiceEnabled", "true");

        const endpoint =
          type === "toll_free"
            ? `/AvailablePhoneNumbers/${params.countryCode || "US"}/TollFree.json`
            : `/AvailablePhoneNumbers/${params.countryCode || "US"}/Local.json`;

        const response = await twilioFetch(endpoint + "?" + searchParams.toString());

        if (!response.ok) {
          const errorData = (await response.json()) as unknown;
          return { error: parseTwilioError(errorData) };
        }

        const data = (await response.json()) as {
          available_phone_numbers?: Array<{
            phone_number?: string;
            friendly_name?: string;
            capabilities?: { voice?: boolean; sms?: boolean; mms?: boolean };
          }>;
          [key: string]: unknown;
        };

        const numbers = data.available_phone_numbers || [];
        return numbers.map((n) => ({
          phone_number: n.phone_number || "",
          friendly_name: n.friendly_name || n.phone_number || "",
          type: (params.phoneType || "local") as "local" | "toll_free" | "mobile",
          monthly_cost_cents: type === "toll_free" ? 800 : 500,
          setup_fee_cents: 200,
          capabilities: {
            voice: n.capabilities?.voice ?? true,
            sms: n.capabilities?.sms ?? true,
            mms: n.capabilities?.mms ?? false,
          },
        }));
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to search available numbers" };
      }
    },

    async purchaseNumber(phoneNumberE164, options) {
      try {
        if (!accountSid || !authToken) {
          return { error: "Twilio not configured" };
        }

        const formData = new URLSearchParams();
        formData.append("PhoneNumber", phoneNumberE164);
        if (options?.messagingProfileId) {
          formData.append("SmsMethod", "POST");
          formData.append("SmsUrl", "");
        }

        const response = await twilioFetch(
          `/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
          {
            method: "POST",
            body: formData.toString(),
          }
        );

        if (!response.ok) {
          const errorData = (await response.json()) as unknown;
          return { error: parseTwilioError(errorData) };
        }

        const data = (await response.json()) as {
          sid?: string;
          phone_number?: string;
          status?: string;
          [key: string]: unknown;
        };

        return {
          numberId: data.sid || "unknown",
          phoneNumber: data.phone_number || phoneNumberE164,
          status: data.status || "active",
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to purchase number" };
      }
    },

    async releaseNumber(numberId: string) {
      try {
        if (!accountSid || !authToken) {
          return { error: "Twilio not configured" };
        }

        const response = await twilioFetch(
          `/Accounts/${accountSid}/IncomingPhoneNumbers/${numberId}.json`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const errorData = (await response.json()) as unknown;
          return { error: parseTwilioError(errorData) };
        }

        return { success: true };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to release number" };
      }
    },

    async createOutboundCall(params: CallParams) {
      try {
        if (!accountSid || !authToken) {
          return { error: "Twilio not configured" };
        }

        // Determine base URL for callbacks
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

        // Build TwiML URL — Twilio needs a URL that returns TwiML instructions.
        // If a voice server URL is configured, use Stream; otherwise use simple Say.
        const voiceServerUrl = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL;
        let twimlUrl = params.webhookUrl;

        // If the webhook URL is a Telnyx webhook (from fallback), use the Twilio voice webhook instead
        if (twimlUrl.includes("/webhooks/telnyx/")) {
          twimlUrl = twimlUrl.replace("/webhooks/telnyx/voice", "/webhooks/twilio/voice");
        }

        const formData = new URLSearchParams();
        formData.append("From", params.from);
        formData.append("To", params.to);
        formData.append("Url", twimlUrl);
        formData.append("Method", "POST");

        // Status callback for tracking call lifecycle
        if (baseUrl) {
          formData.append("StatusCallback", `${baseUrl}/api/webhooks/twilio/status`);
          formData.append("StatusCallbackMethod", "POST");
          formData.append("StatusCallbackEvent", "initiated");
          formData.append("StatusCallbackEvent", "ringing");
          formData.append("StatusCallbackEvent", "answered");
          formData.append("StatusCallbackEvent", "completed");
        }

        // Enable recording if metadata is present (workspace calls)
        if (params.metadata) {
          formData.append("Record", "true");
        }

        // Set timeout to 60 seconds
        formData.append("Timeout", "60");

        // Enable answering machine detection
        formData.append("MachineDetection", "Enable");
        formData.append("MachineDetectionTimeout", "5");

        const response = await twilioFetch(
          `/Accounts/${accountSid}/Calls.json`,
          {
            method: "POST",
            body: formData.toString(),
          }
        );

        if (!response.ok) {
          const errorData = (await response.json()) as unknown;
          return { error: parseTwilioError(errorData) };
        }

        const data = (await response.json()) as {
          sid?: string;
          status?: string;
          [key: string]: unknown;
        };

        return {
          callId: data.sid || "unknown",
          status: (data.status as CallResult["status"]) || "queued",
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to create outbound call" };
      }
    },
  };
}

/**
 * Telephony service with automatic fallback.
 * If the primary provider's createOutboundCall fails, retries with the fallback.
 * This is critical for Telnyx trust-level restrictions (D60/D61) — calls fail
 * at the provider level but Twilio may succeed.
 */
function createFallbackService(
  primary: TelephonyService,
  fallback: TelephonyService,
  primaryName: string,
  fallbackName: string,
): TelephonyService {
  return {
    // SMS: try primary, fall back on failure
    async sendSms(params: SmsParams) {
      const result = await primary.sendSms(params);
      if ("error" in result) {
        console.warn(`[telephony-fallback] ${primaryName} SMS failed: ${result.error} — trying ${fallbackName}`);
        return fallback.sendSms(params);
      }
      return result;
    },

    // Number search: primary only (no fallback needed for browsing)
    searchAvailableNumbers: primary.searchAvailableNumbers.bind(primary),
    purchaseNumber: primary.purchaseNumber.bind(primary),
    releaseNumber: primary.releaseNumber.bind(primary),

    // Outbound calls: try primary, fall back on failure (the critical path)
    async createOutboundCall(params: CallParams) {
      const result = await primary.createOutboundCall(params);
      if ("error" in result) {
        console.warn(`[telephony-fallback] ${primaryName} outbound call failed: ${result.error} — trying ${fallbackName}`);
        // Adjust webhook URL for the fallback provider
        const fallbackParams = { ...params };
        if (fallbackName === "twilio" && params.webhookUrl.includes("/telnyx/")) {
          fallbackParams.webhookUrl = params.webhookUrl.replace("/webhooks/telnyx/voice", "/webhooks/twilio/voice");
        } else if (fallbackName === "telnyx" && params.webhookUrl.includes("/twilio/")) {
          fallbackParams.webhookUrl = params.webhookUrl.replace("/webhooks/twilio/voice", "/webhooks/telnyx/voice");
        }
        return fallback.createOutboundCall(fallbackParams);
      }
      return result;
    },
  };
}

/**
 * Get the appropriate telephony service based on configuration.
 * Supports automatic fallback: TELEPHONY_FALLBACK_PROVIDER=twilio
 */
export function getTelephonyService(): TelephonyService {
  const provider = getTelephonyProvider();
  const primary = provider === "telnyx" ? createTelnyxService() : createTwilioService();
  const primaryName = provider;

  // Check for fallback provider
  const fallbackRaw = process.env.TELEPHONY_FALLBACK_PROVIDER?.trim().toLowerCase();
  if (fallbackRaw && fallbackRaw !== provider) {
    const fallback = fallbackRaw === "telnyx" ? createTelnyxService() : createTwilioService();
    return createFallbackService(primary, fallback, primaryName, fallbackRaw);
  }

  return primary;
}

// Export individual service creators for testing/flexibility
export { createTelnyxService, createTwilioService };
