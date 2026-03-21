/**
 * Auto-provision phone number for text handling.
 *
 * Called when the user clicks "Activate text handling" in onboarding.
 * Telnyx is the primary provider; this route uses the unified telephony interface.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getTelephonyProvider } from "@/lib/telephony/get-telephony-provider";
import { getTelephonyService } from "@/lib/telephony";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  let workspaceId = session?.workspaceId;
  let body: { workspace_id?: string; area_code?: string } = {};

  try {
    body = (await req.json().catch(() => ({}))) as { workspace_id?: string; area_code?: string };
  } catch {
    // ignore
  }

  if (!workspaceId) workspaceId = body.workspace_id?.trim() ?? undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const areaCode = body.area_code?.replace(/\D/g, "").slice(0, 3) || undefined;

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("id, billing_status")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const billingStatus = (ws as { billing_status?: string }).billing_status;
  if (!billingStatus || !["trial", "active"].includes(billingStatus)) {
    return NextResponse.json(
      { error: "Active subscription required to provision phone numbers.", code: "SUBSCRIPTION_REQUIRED" },
      { status: 403 },
    );
  }

  // Check if already provisioned
  const { data: existingNumber } = await db
    .from("phone_numbers")
    .select("phone_number, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();

  if (
    existingNumber &&
    (existingNumber as { phone_number: string; status: string }).status === "active"
  ) {
    return NextResponse.json({
      success: true,
      phone_number: (existingNumber as { phone_number: string }).phone_number,
      status: "active",
      message: "Text handling already active",
    });
  }

  const telephonyProvider = getTelephonyProvider();
  const telephony = getTelephonyService();

  // Search the closest available number (prefer user's area code)
  const numbers = await telephony.searchAvailableNumbers({ areaCode, limit: 1 });
  if ("error" in numbers) {
    return NextResponse.json({ error: numbers.error, code: "NO_INVENTORY" }, { status: 502 });
  }
  if (numbers.length === 0) {
    return NextResponse.json(
      {
        error:
          "No numbers available in this region. Try a different area code or leave it blank for the nearest available.",
        code: "NO_INVENTORY",
      },
      { status: 404 },
    );
  }

  const selected = numbers[0];
  const purchased = await telephony.purchaseNumber(selected.phone_number, {
    connectionId: process.env.TELNYX_CONNECTION_ID,
    messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID,
  });

  if ("error" in purchased) {
    return NextResponse.json({ error: purchased.error, code: "PROVISION_ERROR" }, { status: 502 });
  }

  const phoneNumber = purchased.phoneNumber;
  const phoneSid = purchased.numberId;

  await db.from("phone_numbers").insert({
    workspace_id: workspaceId,
    phone_number: phoneNumber,
    friendly_name: phoneNumber,
    country_code: "US",
    number_type: "local",
    provider: telephonyProvider,
    provider_sid: phoneSid,
    status: "active",
    monthly_cost_cents: 300,  // $3/mo local — consistent with /api/phone/provision
    setup_fee_cents: 100,     // $1.00 setup — consistent with /api/phone/provision
    capabilities: { voice: true, sms: true, mms: false },
    updated_at: new Date().toISOString(),
  });

  await db.from("phone_configs").upsert(
    {
      workspace_id: workspaceId,
      mode: "direct",
      proxy_number: phoneNumber,
      twilio_account_sid: telephonyProvider === "twilio" ? process.env.TWILIO_ACCOUNT_SID ?? null : null,
      twilio_phone_sid: telephonyProvider === "twilio" ? phoneSid : null,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  );

  return NextResponse.json({
    success: true,
    phone_number: phoneNumber,
    status: "active",
    message: "Text handling activated",
  });
}
