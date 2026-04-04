/**
 * GET /api/phone/available — Search available phone numbers (Twilio when configured).
 * Query: country, state, areaCode, type (local | toll_free | mobile)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { SUPPORTED_PHONE_COUNTRIES } from "@/lib/constants";
import { getTelephonyService } from "@/lib/telephony";
import { checkRateLimit } from "@/lib/rate-limit";

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
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  // Rate limit: 10 phone searches per minute per workspace
  const rl = await checkRateLimit(`phone_search:${session.workspaceId}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many search requests. Please wait a moment." }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const country = searchParams.get("country") || "US";
  const state = searchParams.get("state") || "";
  const areaCode = searchParams.get("areaCode")?.replace(/\D/g, "").slice(0, 3) || "";
  const type = (searchParams.get("type") || "local") as "local" | "toll_free" | "mobile";

  const countryCode = (country || "US").toUpperCase();
  if (!SUPPORTED_PHONE_COUNTRIES.includes(countryCode as (typeof SUPPORTED_PHONE_COUNTRIES)[number])) {
    return NextResponse.json({ error: "Country not supported" }, { status: 400 });
  }

  try {
    const telephony = getTelephonyService();
    const phoneType = type === "toll_free" ? "toll_free" : type === "mobile" ? "mobile" : "local";

    const result = await telephony.searchAvailableNumbers({
      countryCode,
      areaCode,
      state,
      phoneType,
      limit: 20,
    });

    if ("error" in result) {
      return NextResponse.json({
        numbers: [],
        message: "No numbers available for this search. Try a different area code or type.",
      });
    }

    const list: AvailableNumber[] = result.map((n) => ({
      phone_number: n.phone_number,
      friendly_name: n.friendly_name,
      type: n.type,
      monthly_cost_cents: n.monthly_cost_cents,
      setup_fee_cents: n.setup_fee_cents,
      capabilities: n.capabilities,
    }));

    return NextResponse.json({ numbers: list });
  } catch {
    return NextResponse.json({
      numbers: [],
      message: "Phone service is not configured yet. Go to Settings → Integrations to connect your phone provider, or contact support for help.",
    });
  }
}
