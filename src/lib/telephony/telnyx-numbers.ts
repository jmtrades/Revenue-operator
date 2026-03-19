/**
 * Telnyx phone number management API functions.
 * Handles searching, purchasing, and releasing phone numbers.
 */

import { telnyxRequest, parseTelnyxError } from "./telnyx-client";

export interface SearchAvailableNumbersParams {
  countryCode?: string;
  areaCode?: string;
  state?: string;
  phoneType?: "local" | "toll_free" | "mobile";
  limit?: number;
}

export interface AvailableNumberData {
  phone_number: string;
  region_name?: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export interface PurchaseNumberParams {
  phoneNumberE164: string;
  countryCode?: string;
  phoneType?: "local" | "toll_free" | "mobile";
  connectionId?: string;
  messagingProfileId?: string;
  webhookUrl?: string;
}

export interface PhoneNumberOrderResponse {
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      id?: string;
      phone_number?: string;
      status?: string;
      carrier?: string;
      country?: string;
      created_at?: string;
    };
  };
}

/**
 * Search for available phone numbers in Telnyx catalog.
 */
export async function searchAvailableNumbers(
  params: SearchAvailableNumbersParams
): Promise<AvailableNumberData[] | { error: string }> {
  try {
    const url = new URL("https://api.telnyx.com/v2/available_phone_numbers");

    if (params.countryCode) {
      url.searchParams.set("filter[country_code]", params.countryCode);
    }
    if (params.areaCode) {
      url.searchParams.set("filter[area_code]", params.areaCode);
    }
    if (params.state) {
      url.searchParams.set("filter[state]", params.state);
    }

    const numberType = params.phoneType || "local";
    if (numberType === "toll_free") {
      url.searchParams.set("filter[phone_number_type]", "toll_free");
    } else if (numberType === "mobile") {
      url.searchParams.set("filter[phone_number_type]", "mobile");
    } else {
      url.searchParams.set("filter[phone_number_type]", "local");
    }

    url.searchParams.set("page[size]", String(params.limit || 20));
    url.searchParams.set("filter[features]", "sms");

    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) {
      throw new Error("TELNYX_API_KEY not configured");
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as {
      data?: Array<{
        id?: string;
        attributes?: {
          phone_number?: string;
          region_name?: string;
          capabilities?: {
            sms?: boolean;
            voice?: boolean;
            mms?: boolean;
          };
        };
      }>;
      errors?: Array<{ detail?: string; title?: string }>;
    };

    if (!response.ok) {
      const error = Array.isArray(data.errors) && data.errors[0]?.detail
        ? data.errors[0].detail
        : "Failed to search available numbers";
      return { error };
    }

    const numbers: AvailableNumberData[] = (data.data || [])
      .map((item) => ({
        phone_number: item.attributes?.phone_number || "",
        region_name: item.attributes?.region_name,
        capabilities: {
          voice: item.attributes?.capabilities?.voice ?? true,
          sms: item.attributes?.capabilities?.sms ?? true,
          mms: item.attributes?.capabilities?.mms ?? false,
        },
      }))
      .filter((n) => n.phone_number);

    return numbers;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Purchase a phone number and configure it with voice/SMS webhook.
 */
export async function purchaseNumber(
  params: PurchaseNumberParams
): Promise<{ numberId: string; phoneNumber: string; status: string } | { error: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const voiceWebhookUrl = params.webhookUrl || `${baseUrl}/api/webhooks/telnyx/voice`;
    const smsWebhookUrl = `${baseUrl}/api/webhooks/telnyx/inbound`;

    const body = {
      phone_number: params.phoneNumberE164,
      address_id: null, // Optional: address for regulatory requirements
      connection_id: params.connectionId || process.env.TELNYX_CONNECTION_ID,
      messaging_profile_id: params.messagingProfileId || process.env.TELNYX_MESSAGING_PROFILE_ID,
      webhook_url: voiceWebhookUrl,
      webhook_url_method: "POST",
    };

    const response = await telnyxRequest<PhoneNumberOrderResponse>(
      "/number_orders",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    const numberId = response.data?.id || response.data?.attributes?.id || "";
    const phoneNumber = response.data?.attributes?.phone_number || params.phoneNumberE164;

    if (!numberId) {
      return { error: "No number ID returned from Telnyx" };
    }

    return { numberId, phoneNumber, status: response.data?.attributes?.status || "pending" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Release/disconnect a purchased phone number.
 */
export async function releaseNumber(
  phoneNumberId: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    await telnyxRequest(`/phone_numbers/${phoneNumberId}`, {
      method: "DELETE",
    });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}

/**
 * Get details about a provisioned phone number.
 */
export async function getPhoneNumberDetails(
  phoneNumberId: string
): Promise<{ phoneNumber: string; status: string; capabilities: AvailableNumberData["capabilities"] } | { error: string }> {
  try {
    const response = await telnyxRequest<{
      data?: {
        attributes?: {
          phone_number?: string;
          status?: string;
          capabilities?: {
            voice?: boolean;
            sms?: boolean;
            mms?: boolean;
          };
        };
      };
    }>(`/phone_numbers/${phoneNumberId}`, {
      method: "GET",
    });

    const attributes = response.data?.attributes;
    if (!attributes?.phone_number) {
      return { error: "Phone number not found" };
    }

    return {
      phoneNumber: attributes.phone_number,
      status: attributes.status || "unknown",
      capabilities: {
        voice: attributes.capabilities?.voice ?? true,
        sms: attributes.capabilities?.sms ?? true,
        mms: attributes.capabilities?.mms ?? false,
      },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: errorMessage };
  }
}
