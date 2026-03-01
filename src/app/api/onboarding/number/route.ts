/**
 * POST /api/onboarding/number — Screen 4: provision phone number for workspace.
 * Returns { phone_number } or stub number when Twilio not configured.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspace_id = body.workspace_id;
  if (!workspace_id) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspace_id).maybeSingle();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid && authToken) {
    try {
      const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?SmsEnabled=true&Limit=1`;
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64") },
      });
      if (searchRes.ok) {
        const data = (await searchRes.json()) as { available_phone_numbers?: Array<{ phone_number: string }> };
        const num = data.available_phone_numbers?.[0]?.phone_number;
        if (num) {
          const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
          const purchaseRes = await fetch(purchaseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
            },
            body: new URLSearchParams({ PhoneNumber: num }),
          });
          if (purchaseRes.ok) {
            const purchaseJson = (await purchaseRes.json()) as { sid?: string };
            const existing = await db.from("phone_configs").select("id").eq("workspace_id", workspace_id).maybeSingle();
            if (!existing) {
              await db.from("phone_configs").insert({
                workspace_id,
                proxy_number: num,
                status: "active",
                twilio_phone_sid: purchaseJson.sid ?? null,
              });
            }
            return NextResponse.json({ phone_number: num });
          }
        }
      }
    } catch (e) {
      console.error("Twilio provision error:", e);
    }
  }

  const stubNumber = "+1 (555) 000-" + workspace_id.slice(0, 4);
  return NextResponse.json({ phone_number: stubNumber, stub: true });
}
