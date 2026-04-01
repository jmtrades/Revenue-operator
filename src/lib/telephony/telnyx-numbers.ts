/**
 * Telnyx phone number management API functions.
 * Handles searching, purchasing, and releasing phone numbers.
 *
 * Telnyx v2 API response format for available_phone_numbers:
 * {
 *   data: [{
 *     record_type: "available_phone_number",
 *     phone_number: "+19705555098",
 *     vanity_format: "",
 *     best_effort: false,
 *     quickship: true,
 *     reservable: true,
 *     region_information: [{ region_type: "country_code", region_name: "US" }],
 *     cost_information: { upfront_cost: "3.21", monthly_cost: "6.54", currency: "USD" },
 *     features: [{ name: "sms" }, { name: "voice" }]
 *   }],
 *   meta: { total_results: 100, best_effort_results: 50 }
 * }
 */

import { telnyxRequest } from "./telnyx-client";
import { log } from "@/lib/logger";

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
  monthly_cost?: string;
  upfront_cost?: string;
  currency?: string;
}

export interface PurchaseNumberParams {
  phoneNumberE164: string;
  countryCode?: string;
  phoneType?: "local" | "toll_free" | "mobile";
  connectionId?: string;
  messagingProfileId?: string;
  webhookUrl?: string;
}

/* ── Telnyx API response types ──────────────────────────────── */

interface TelnyxAvailableNumber {
  record_type?: string;
  phone_number?: string;
  vanity_format?: string;
  best_effort?: boolean;
  quickship?: boolean;
  reservable?: boolean;
  region_information?: Array<{
    region_type?: string;
    region_name?: string;
  }>;
  cost_information?: {
    upfront_cost?: string;
    monthly_cost?: string;
    currency?: string;
  };
  features?: Array<{ name?: string }>;
}

interface TelnyxAvailableNumbersResponse {
  data?: TelnyxAvailableNumber[];
  errors?: Array<{ detail?: string; title?: string; code?: string }>;
  meta?: { total_results?: number; best_effort_results?: number };
}

interface TelnyxNumberOrderResponse {
  data?: {
    id?: string;
    record_type?: string;
    phone_numbers_count?: number;
    status?: string;
    phone_numbers?: Array<{
      id?: string;
      phone_number?: string;
      record_type?: string;
      regulatory_requirements?: unknown[];
      requirements_met?: boolean;
      status?: string;
    }>;
    connection_id?: string;
    messaging_profile_id?: string;
    created_at?: string;
  };
  errors?: Array<{ detail?: string; title?: string; code?: string }>;
}

interface TelnyxPhoneNumberResponse {
  data?: {
    id?: string;
    record_type?: string;
    phone_number?: string;
    status?: string;
    connection_id?: string;
    tags?: string[];
    messaging_profile_id?: string;
  };
  errors?: Array<{ detail?: string; title?: string; code?: string }>;
}

/* ── Helper: extract capabilities from Telnyx features array ── */
function extractCapabilities(features?: Array<{ name?: string }>): {
  voice: boolean;
  sms: boolean;
  mms: boolean;
} {
  if (!features || features.length === 0) {
    return { voice: true, sms: true, mms: false };
  }
  const names = features.map((f) => f.name?.toLowerCase() || "");
  return {
    voice: names.includes("voice"),
    sms: names.includes("sms"),
    mms: names.includes("mms"),
  };
}

/* ── Helper: extract region name from region_information ────── */
function extractRegionName(
  regionInfo?: Array<{ region_type?: string; region_name?: string }>
): string | undefined {
  if (!regionInfo || regionInfo.length === 0) return undefined;
  // Prefer state/rate_center over country_code
  const state = regionInfo.find((r) => r.region_type === "state");
  if (state?.region_name) return state.region_name;
  const rateCenter = regionInfo.find((r) => r.region_type === "rate_center");
  if (rateCenter?.region_name) return rateCenter.region_name;
  return regionInfo[0]?.region_name;
}

/**
 * Search for available phone numbers in Telnyx catalog.
 */
export async function searchAvailableNumbers(
  params: SearchAvailableNumbersParams
): Promise<AvailableNumberData[] | { error: string }> {
  try {
    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) {
      return { error: "TELNYX_API_KEY not configured" };
    }

    const url = new URL("https://api.telnyx.com/v2/available_phone_numbers");

    if (params.countryCode) {
      url.searchParams.set("filter[country_code]", params.countryCode);
    }
    if (params.areaCode) {
      url.searchParams.set("filter[national_destination_code]", params.areaCode);
    }
    if (params.state) {
      url.searchParams.set("filter[administrative_area]", params.state);
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

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const json = (await response.json()) as TelnyxAvailableNumbersResponse;

    if (!response.ok) {
      const errMsg =
        Array.isArray(json.errors) && json.errors[0]?.detail
          ? json.errors[0].detail
          : `Telnyx API error (${response.status})`;
      log("error", "[telnyx-numbers] search error", { error: errMsg });
      return { error: errMsg };
    }

    if (!json.data || json.data.length === 0) {
      return [];
    }

    // Map Telnyx flat response to our AvailableNumberData shape
    const numbers: AvailableNumberData[] = json.data
      .map((item) => ({
        phone_number: item.phone_number || "",
        region_name: extractRegionName(item.region_information),
        capabilities: extractCapabilities(item.features),
        monthly_cost: item.cost_information?.monthly_cost,
        upfront_cost: item.cost_information?.upfront_cost,
        currency: item.cost_information?.currency,
      }))
      .filter((n) => n.phone_number);

    return numbers;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log("error", "[telnyx-numbers] search exception", { error: errorMessage });
    return { error: errorMessage };
  }
}

/**
 * Purchase a phone number via Telnyx number orders API.
 *
 * POST /v2/number_orders
 * Body: { phone_numbers: [{ phone_number: "+1..." }], connection_id?, messaging_profile_id? }
 */
export async function purchaseNumber(
  params: PurchaseNumberParams
): Promise<
  { numberId: string; phoneNumber: string; status: string } | { error: string }
> {
  try {
    const body: Record<string, unknown> = {
      phone_numbers: [{ phone_number: params.phoneNumberE164 }],
    };

    // Attach connection and messaging profile if available
    const connectionId =
      params.connectionId || process.env.TELNYX_CONNECTION_ID;
    if (connectionId) {
      body.connection_id = connectionId;
    }

    const messagingProfileId =
      params.messagingProfileId || process.env.TELNYX_MESSAGING_PROFILE_ID;
    if (messagingProfileId) {
      body.messaging_profile_id = messagingProfileId;
    }

    const response = await telnyxRequest<TelnyxNumberOrderResponse>(
      "/number_orders",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    const orderId = response.data?.id || "";
    const status = response.data?.status || "pending";

    // The order contains phone_numbers array — get the first one's ID
    const firstNumber = response.data?.phone_numbers?.[0];
    const numberId = firstNumber?.id || orderId;
    const phoneNumber = firstNumber?.phone_number || params.phoneNumberE164;

    if (!numberId && !orderId) {
      return { error: "No order ID returned from Telnyx" };
    }

    return { numberId, phoneNumber, status };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log("error", "[telnyx-numbers] purchase error", { error: errorMessage });
    return { error: errorMessage };
  }
}

/**
 * Release/disconnect a purchased phone number.
 * DELETE /v2/phone_numbers/{id}
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
    log("error", "[telnyx-numbers] release error", { error: errorMessage });
    return { error: errorMessage };
  }
}

/**
 * Get details about a provisioned phone number.
 * GET /v2/phone_numbers/{id}
 */
export async function getPhoneNumberDetails(
  phoneNumberId: string
): Promise<
  | {
      phoneNumber: string;
      status: string;
      capabilities: AvailableNumberData["capabilities"];
    }
  | { error: string }
> {
  try {
    const response = await telnyxRequest<TelnyxPhoneNumberResponse>(
      `/phone_numbers/${phoneNumberId}`,
      { method: "GET" }
    );

    const data = response.data;
    if (!data?.phone_number) {
      return { error: "Phone number not found" };
    }

    return {
      phoneNumber: data.phone_number,
      status: data.status || "unknown",
      // Provisioned numbers don't have a features array, assume full capabilities
      capabilities: { voice: true, sms: true, mms: false },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log("error", "[telnyx-numbers] get details error", { error: errorMessage });
    return { error: errorMessage };
  }
}
