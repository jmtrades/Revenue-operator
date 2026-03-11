/**
 * POST /api/phone/provision — Provision a number for the workspace.
 * Body: { phone_number: string, friendly_name?: string, number_type?: string }
 * Creates record in revenue_operator.phone_numbers; when Twilio configured, purchases via Twilio first.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BODY = z.object({
  phone_number: z.string().min(10).max(20),
  friendly_name: z.string().max(100).optional(),
  number_type: z.enum(["local", "toll_free", "mobile"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BODY.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { phone_number, friendly_name, number_type } = parsed.data;
  const normalized = phone_number.replace(/\D/g, "");
  const e164 = normalized.startsWith("1") && normalized.length === 11 ? `+${normalized}` : `+1${normalized}`;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin ?? "";

  let providerSid: string | null = null;
  if (accountSid && authToken) {
    try {
      const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
      const purchaseParams = new URLSearchParams({
        PhoneNumber: e164,
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
      if (!purchaseRes.ok) {
        const errText = await purchaseRes.text().catch(() => "");
        return NextResponse.json(
          { error: "Could not provision number. It may already be in use or unavailable.", details: errText.slice(0, 200) },
          { status: 400 }
        );
      }
      const purchaseData = (await purchaseRes.json()) as { sid?: string };
      providerSid = purchaseData.sid ?? null;
    } catch (e) {
      console.warn("[phone/provision] Twilio purchase failed", e);
      return NextResponse.json({ error: "Provisioning failed. Try again later." }, { status: 500 });
    }
  }

  const db = getDb();
  const { data: existing } = await db
    .from("phone_numbers")
    .select("id")
    .eq("phone_number", e164)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "This number is already provisioned to a workspace." }, { status: 409 });
  }

  const monthlyCost = number_type === "toll_free" ? 200 : 150;
  const { data: inserted, error } = await db
    .from("phone_numbers")
    .insert({
      workspace_id: session.workspaceId,
      phone_number: e164,
      friendly_name: friendly_name ?? e164,
      country_code: "US",
      number_type: number_type ?? "local",
      capabilities: { voice: true, sms: true, mms: false },
      provider: accountSid ? "twilio" : "vapi",
      provider_sid: providerSid,
      status: "active",
      monthly_cost_cents: monthlyCost,
      updated_at: new Date().toISOString(),
    })
    .select("id, phone_number, friendly_name, number_type, status, monthly_cost_cents")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save number." }, { status: 500 });
  }

  return NextResponse.json({
    id: (inserted as { id: string }).id,
    phone_number: (inserted as { phone_number: string }).phone_number,
    friendly_name: (inserted as { friendly_name?: string }).friendly_name,
    number_type: (inserted as { number_type: string }).number_type,
    status: (inserted as { status: string }).status,
    monthly_cost_cents: (inserted as { monthly_cost_cents: number }).monthly_cost_cents,
  });
}
