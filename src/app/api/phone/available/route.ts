/**
 * GET /api/phone/available — Search available phone numbers (Twilio when configured).
 * Query: country, state, areaCode, type (local | toll_free | mobile)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";

export const dynamic = "force-dynamic";

type AvailableNumber = {
  phone_number: string;
  friendly_name: string;
  type: "local" | "toll_free" | "mobile";
  monthly_cost_cents: number;
  setup_fee_cents: number;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
};

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const country = searchParams.get("country") || "US";
  const state = searchParams.get("state") || "";
  const areaCode = searchParams.get("areaCode")?.replace(/\D/g, "").slice(0, 3) || "";
  const type = (searchParams.get("type") || "local") as "local" | "toll_free" | "mobile";

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  const countryCode = (country || "US").toUpperCase();
  const SUPPORTED_COUNTRIES = [
    "US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "SE",
    "NO", "DK", "FI", "IE", "AT", "CH", "BE", "PT", "JP", "BR",
    "MX", "IN", "SG", "HK", "NZ", "ZA", "IL", "PL", "CZ"
  ];

  if (!SUPPORTED_COUNTRIES.includes(countryCode)) {
    return NextResponse.json({ error: "Country not supported" }, { status: 400 });
  }

  if (accountSid && authToken) {
    try {
      const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const subPath = type === "toll_free" ? "TollFree" : "Local";
      const url = new URL(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${countryCode}/${subPath}.json`
      );
      url.searchParams.set("Limit", "20");
      url.searchParams.set("SmsEnabled", "true");
      if (areaCode && (countryCode === "US" || countryCode === "CA")) {
        url.searchParams.set("AreaCode", areaCode);
      }
      if (state && countryCode === "US" && subPath === "Local") {
        url.searchParams.set("InRegion", state);
      }

      const res = await fetch(url.toString(), { headers: { Authorization: authHeader } });
      if (!res.ok) {
        await res.text().catch(() => "");
        return NextResponse.json({
          numbers: [],
          message: "No numbers available for this search. Try a different area code or type.",
        });
      }
      const data = (await res.json()) as { available_phone_numbers?: Array<{ phone_number: string }> };
      const list: AvailableNumber[] = (data.available_phone_numbers || []).slice(0, 20).map((n) => ({
        phone_number: n.phone_number,
        friendly_name: n.phone_number,
        type: (type === "toll_free" ? "toll_free" : "local") as "local" | "toll_free" | "mobile",
        monthly_cost_cents: type === "toll_free" ? 200 : 150,
        setup_fee_cents: 0,
        capabilities: { voice: true, sms: true, mms: false },
      }));
      return NextResponse.json({ numbers: list });
    } catch {
      // fall through to placeholder response
    }
  }

  // Fallback: return placeholder options when Twilio not configured
  const placeholders: AvailableNumber[] = [
    {
      phone_number: "+15551234567",
      friendly_name: "(555) 123-4567",
      type: "local" as const,
      monthly_cost_cents: 150,
      setup_fee_cents: 0,
      capabilities: { voice: true, sms: true, mms: false },
    },
    {
      phone_number: "+18005551234",
      friendly_name: "(800) 555-1234",
      type: "toll_free" as const,
      monthly_cost_cents: 200,
      setup_fee_cents: 0,
      capabilities: { voice: true, sms: true, mms: false },
    },
  ].filter((n) => !areaCode || n.phone_number.includes(areaCode));

  return NextResponse.json({ numbers: placeholders });
}
