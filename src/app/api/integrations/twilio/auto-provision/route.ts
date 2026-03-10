/**
 * Auto-provision Twilio: Assign number automatically, no credential input required
 * Called when user clicks "Activate text handling" in onboarding
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";

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
  const areaCode = body.area_code?.replace(/\D/g, "").slice(0, 3);

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspaceId).single();
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Check if already provisioned
  const { data: existing } = await db
    .from("phone_configs")
    .select("id, proxy_number, status, twilio_phone_sid")
    .eq("workspace_id", workspaceId)
    .single();

  if (existing && existing.status === "active" && existing.proxy_number) {
    return NextResponse.json({
      success: true,
      phone_number: existing.proxy_number,
      status: "active",
      message: "Text handling already active",
    });
  }

  // Use global Twilio account for auto-provisioning
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin ?? "";

  if (!accountSid || !authToken) {
    return NextResponse.json({
      error: "Phone service is being configured. Enter your email and we will notify you when numbers are available.",
      code: "NOT_CONFIGURED",
    }, { status: 503 });
  }

  const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const purchaseNumber = async (phoneNumberToBuy: string): Promise<{ phone_number: string | null; sid: string | null }> => {
    const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
    const purchaseParams = new URLSearchParams({
      PhoneNumber: phoneNumberToBuy,
      VoiceUrl: `${baseUrl}/api/webhooks/twilio/voice`,
      VoiceMethod: "POST",
      SmsUrl: `${baseUrl}/api/webhooks/twilio/inbound`,
      SmsMethod: "POST",
      StatusCallback: `${baseUrl}/api/webhooks/twilio/status`,
      StatusCallbackMethod: "POST",
    });
    const purchaseRes = await fetch(purchaseUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: purchaseParams.toString(),
    });
    if (!purchaseRes.ok) {
      const errText = await purchaseRes.text().catch(() => "");
      console.warn("[twilio-auto-provision] Purchase failed", purchaseRes.status, errText.slice(0, 200));
      return { phone_number: null, sid: null };
    }
    const purchaseData = (await purchaseRes.json()) as { phone_number?: string; sid?: string };
    return {
      phone_number: purchaseData.phone_number ?? null,
      sid: purchaseData.sid ?? null,
    };
  };

  try {
  let phoneNumber: string | null = null;
  let phoneSid: string | null = null;

  // 1) Try Local numbers (optionally in user's area code)
  try {
    const searchParams = new URLSearchParams({ SmsEnabled: "true", Limit: "1" });
    if (areaCode && areaCode.length === 3) searchParams.set("AreaCode", areaCode);
    const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?${searchParams.toString()}`;
    const searchRes = await fetch(searchUrl, { headers: { Authorization: authHeader } });

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as { available_phone_numbers?: Array<{ phone_number: string }> };
      const available = searchData.available_phone_numbers?.[0];
      if (available) {
        const result = await purchaseNumber(available.phone_number);
        phoneNumber = result.phone_number;
        phoneSid = result.sid;
      }
    }
  } catch (error) {
    console.warn("[twilio-auto-provision] Local search/purchase failed", error);
  }

  // 2) If no Local availability, try Toll-Free (often has inventory)
  if (!phoneNumber) {
    try {
      const tollFreeParams = new URLSearchParams({ Limit: "1" });
      const tollFreeUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/TollFree.json?${tollFreeParams.toString()}`;
      const tollFreeRes = await fetch(tollFreeUrl, { headers: { Authorization: authHeader } });

      if (tollFreeRes.ok) {
        const tollFreeData = (await tollFreeRes.json()) as { available_phone_numbers?: Array<{ phone_number: string }> };
        const available = tollFreeData.available_phone_numbers?.[0];
        if (available) {
          const result = await purchaseNumber(available.phone_number);
          phoneNumber = result.phone_number;
          phoneSid = result.sid;
        }
      }
    } catch (error) {
      console.warn("[twilio-auto-provision] Toll-free search/purchase failed", error);
    }
  }

  // 3) Fallback: use proxy number if purchase failed
  if (!phoneNumber) {
    const proxyNumber = process.env.TWILIO_PROXY_NUMBER;
    if (proxyNumber) {
      phoneNumber = proxyNumber;
      try {
        const listUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(proxyNumber.replace(/\s/g, ""))}`;
        const listRes = await fetch(listUrl, {
          headers: { Authorization: authHeader },
        });
        if (listRes.ok) {
          const listData = (await listRes.json()) as { incoming_phone_numbers?: Array<{ sid: string }> };
          const sid = listData.incoming_phone_numbers?.[0]?.sid;
          if (sid) {
            const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${sid}.json`;
            await fetch(updateUrl, {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                VoiceUrl: `${baseUrl}/api/webhooks/twilio/voice`,
                VoiceMethod: "POST",
                SmsUrl: `${baseUrl}/api/webhooks/twilio/inbound`,
                SmsMethod: "POST",
                StatusCallback: `${baseUrl}/api/webhooks/twilio/status`,
                StatusCallbackMethod: "POST",
              }).toString(),
            });
          }
        }
      } catch {
        // Proxy number may not be configurable, continue anyway
      }
    }
  }

  if (!phoneNumber) {
    return NextResponse.json({
      error: "No numbers available in this region. Try a different area code or leave it blank for the nearest available.",
      code: "NO_INVENTORY",
    }, { status: 404 });
  }

  // Store in phone_configs
  await db.from("phone_configs").upsert(
    {
      workspace_id: workspaceId,
      mode: "direct",
      proxy_number: phoneNumber,
      twilio_account_sid: accountSid,
      twilio_phone_sid: phoneSid,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );

  return NextResponse.json({
    success: true,
    phone_number: phoneNumber,
    status: "active",
    message: "Text handling activated",
  });
  } catch (error: unknown) {
    console.error("[twilio-auto-provision]", error);
    const err = error as { code?: number; message?: string };
    const msg = err?.message ?? (error instanceof Error ? error.message : "Unknown error");
    if (err.code === 21422 || (typeof msg === "string" && msg.toLowerCase().includes("not available"))) {
      return NextResponse.json({
        error: "No numbers in that area code. Try a different one or leave blank.",
        code: "PROVISION_ERROR",
      }, { status: 502 });
    }
    return NextResponse.json({
      error: "Phone service error. Please try again.",
      code: "PROVISION_ERROR",
    }, { status: 502 });
  }
}
