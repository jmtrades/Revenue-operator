/**
 * Auto-provision Twilio: Assign number automatically, no credential input required
 * Called when user clicks "Activate text handling" in onboarding
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  let workspaceId = session?.workspaceId;
  if (!workspaceId) {
    try {
      const body = await req.json().catch(() => ({}));
      workspaceId = (body as { workspace_id?: string }).workspace_id?.trim();
    } catch {
      // ignore
    }
  }
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      error: "Twilio not configured. Contact support.",
    }, { status: 500 });
  }

  try {
    let phoneNumber: string | null = null;
    let phoneSid: string | null = null;

    // Try to purchase a new number first
    try {
      const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?SmsEnabled=true&Limit=1`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        },
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json() as { available_phone_numbers?: Array<{ phone_number: string }> };
        const available = searchData.available_phone_numbers?.[0];
        
        if (available) {
          // Purchase the number
          const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
          const purchaseParams = new URLSearchParams({
            PhoneNumber: available.phone_number,
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
              Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: purchaseParams.toString(),
          });

          if (purchaseRes.ok) {
            const purchaseData = await purchaseRes.json() as { phone_number?: string; sid?: string };
            phoneNumber = purchaseData.phone_number ?? null;
            phoneSid = purchaseData.sid ?? null;
          }
        }
      }
    } catch (error) {
      console.warn("[twilio-auto-provision] Failed to purchase number, using proxy", error);
    }

    // Fallback: use proxy number if purchase failed
    if (!phoneNumber) {
      const proxyNumber = process.env.TWILIO_PROXY_NUMBER;
      if (proxyNumber) {
        phoneNumber = proxyNumber;
        // Configure webhooks on existing proxy number (look up SID then update)
        try {
          const listUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(proxyNumber.replace(/\s/g, ""))}`;
          const listRes = await fetch(listUrl, {
            headers: { Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64") },
          });
          if (listRes.ok) {
            const listData = (await listRes.json()) as { incoming_phone_numbers?: Array<{ sid: string }> };
            const sid = listData.incoming_phone_numbers?.[0]?.sid;
            if (sid) {
              const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${sid}.json`;
              await fetch(updateUrl, {
                method: "POST",
                headers: {
                  Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
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
        error: "Unable to provision phone number. Contact support.",
      }, { status: 500 });
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
  } catch (error) {
    console.error("[twilio-auto-provision]", error);
    return NextResponse.json({
      error: "Failed to provision phone number",
    }, { status: 500 });
  }
}
