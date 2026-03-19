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
        monthly_cost_cents: params.phoneType === "toll_free" ? 500 : 300,
        setup_fee_cents: 100,
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
 * Currently a placeholder; actual implementation uses existing sendViaTwilio pattern.
 */
function createTwilioService(): TelephonyService {
  return {
    async sendSms(params: SmsParams) {
      // This is a placeholder. Actual implementation should use the existing
      // sendViaTwilio pattern from src/lib/delivery/provider.ts
      return {
        error: "Twilio SMS service not yet integrated into unified interface",
      };
    },

    async searchAvailableNumbers(params) {
      return { error: "Twilio number search not yet integrated into unified interface" };
    },

    async purchaseNumber() {
      return { error: "Twilio number purchase not yet integrated into unified interface" };
    },

    async releaseNumber() {
      return { error: "Twilio number release not yet integrated into unified interface" };
    },

    async createOutboundCall() {
      return { error: "Twilio outbound calls not yet integrated into unified interface" };
    },
  };
}

/**
 * Get the appropriate telephony service based on configuration.
 */
export function getTelephonyService(): TelephonyService {
  const provider = getTelephonyProvider();
  if (provider === "telnyx") {
    return createTelnyxService();
  }
  return createTwilioService();
}

// Export individual service creators for testing/flexibility
export { createTelnyxService, createTwilioService };
