type TelnyxPhoneNumberType = "local" | "toll_free" | "mobile";

export async function listAvailableTelnyxPhoneNumbers(params: {
  countryCode: string;
  areaCode?: string;
  state?: string;
  phoneType: "local" | "toll_free" | "mobile";
}): Promise<Array<{ phone_number: string }>> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) return [];

  const { countryCode, areaCode, state, phoneType } = params;

  const filter: Record<string, string> = {
    "filter[country_code]": countryCode,
    "filter[phone_number_type]":
      (phoneType === "toll_free" ? "toll_free" : phoneType === "local" ? "local" : "mobile") satisfies TelnyxPhoneNumberType,
    "filter[limit]": "20",
  };

  // Best-effort NANP filtering.
  if (areaCode) filter["filter[national_destination_code]"] = areaCode;

  // Optional administrative area (US state / CA province).
  if (state && phoneType === "local") filter["filter[administrative_area]"] = state;

  // Toll-free: prefer quickship (usable immediately).
  if (phoneType === "toll_free") filter["filter[quickship]"] = "true";

  const url = new URL("https://api.telnyx.com/v2/available_phone_numbers");
  for (const [k, v] of Object.entries(filter)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) return [];

  const json = (await res.json()) as {
    data?: Array<{ phone_number?: string }>;
  };

  return (json.data ?? [])
    .map((r) => (r.phone_number ? { phone_number: r.phone_number } : null))
    .filter(Boolean) as Array<{ phone_number: string }>;
}

export async function purchaseTelnyxPhoneNumber(params: {
  phoneNumberE164: string;
  countryCode: string;
  phoneType: "local" | "toll_free" | "mobile";
}): Promise<{ providerSid: string | null; error?: string; telnyxStatus?: number }> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) return { providerSid: null, error: "TELNYX_API_KEY not configured" };

  const { phoneNumberE164 } = params;

  const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID;
  const connectionId = process.env.TELNYX_CONNECTION_ID;
  const billingGroupId = process.env.TELNYX_BILLING_GROUP_ID;
  const bundleId = process.env.TELNYX_BUNDLE_ID;
  const requirementGroupId = process.env.TELNYX_REQUIREMENT_GROUP_ID;

  const phoneNumberPayload: Record<string, string> = { phone_number: phoneNumberE164 };
  if (bundleId) phoneNumberPayload.bundle_id = bundleId;
  if (!bundleId && requirementGroupId) phoneNumberPayload.requirement_group_id = requirementGroupId;

  const body: Record<string, unknown> = {
    phone_numbers: [phoneNumberPayload],
    ...(connectionId ? { connection_id: connectionId } : {}),
    ...(messagingProfileId ? { messaging_profile_id: messagingProfileId } : {}),
    ...(billingGroupId ? { billing_group_id: billingGroupId } : {}),
  };

  const res = await fetch("https://api.telnyx.com/v2/number_orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // Parse Telnyx error details for better logging
    let errorDetail = `HTTP ${res.status}`;
    try {
      const errJson = JSON.parse(errText) as { errors?: Array<{ detail?: string; code?: string; title?: string }> };
      if (errJson.errors?.[0]) {
        const e = errJson.errors[0];
        errorDetail = `${e.code ?? res.status}: ${e.detail ?? e.title ?? "Unknown error"}`;
      }
    } catch {
      errorDetail = errText.slice(0, 200) || `HTTP ${res.status}`;
    }
    console.error("[telnyx] Number order failed:", res.status, errorDetail, "| body sent:", JSON.stringify({ connection_id: connectionId ? "set" : "MISSING", phone: phoneNumberE164 }));
    return { providerSid: null, error: errorDetail, telnyxStatus: res.status };
  }

  const json = (await res.json()) as {
    data?: {
      id?: string;
      phone_numbers?: Array<{ id?: string; phone_number?: string }>;
      status?: string;
    };
  };

  const phoneNumberId = json.data?.phone_numbers?.[0]?.id;
  const orderId = json.data?.id;
  const providerSid = (phoneNumberId ?? orderId ?? null) as string | null;

  return { providerSid };
}

