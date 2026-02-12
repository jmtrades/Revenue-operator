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
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  const db = getDb();

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000";

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

    // Fallback: use existing proxy number if available
    if (!phoneNumber) {
      const proxyNumber = process.env.TWILIO_PROXY_NUMBER;
      if (proxyNumber) {
        phoneNumber = proxyNumber;
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
