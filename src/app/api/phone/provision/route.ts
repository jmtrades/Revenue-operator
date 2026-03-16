/**
 * POST /api/phone/provision — Provision a number for the workspace.
 * Body: { phone_number: string, friendly_name?: string, number_type?: string }
 * Creates record in revenue_operator.phone_numbers; when Twilio configured, purchases via Twilio first.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BODY = z.object({
  phone_number: z.string().min(10).max(20),
  friendly_name: z.string().max(100).optional(),
  number_type: z.enum(["local", "toll_free", "mobile"]).optional(),
  country: z.string().min(2).max(2).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: workspace } = await db
    .from("workspaces")
    .select("billing_status")
    .eq("id", session.workspaceId)
    .maybeSingle();
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  const status = (workspace as { billing_status?: string }).billing_status;
  if (!status || !["trial", "active"].includes(status)) {
    return NextResponse.json(
      { error: "Active subscription required to provision phone numbers." },
      { status: 403 }
    );
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

  const { phone_number, friendly_name, number_type, country } = parsed.data;
  const trimmed = phone_number.trim();
  let e164: string;
  if (trimmed.startsWith("+")) {
    // Trust Twilio marketplace E.164 formatting when provided.
    e164 = trimmed;
  } else {
    const digits = trimmed.replace(/\D/g, "");
    const upperCountry = (country || "US").toUpperCase();
    // North America (US/CA) share country code +1; handle 10‑digit NANP numbers explicitly.
    if ((upperCountry === "US" || upperCountry === "CA") && digits.length === 10) {
      e164 = `+1${digits}`;
    } else {
      e164 = `+${digits}`;
    }
  }

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
        console.error(`[provision] Twilio purchase failed (${purchaseRes.status}):`, errText.slice(0, 500));

        // Parse Twilio error for user-friendly messaging
        let userMessage = "Could not provision number. It may already be in use or unavailable.";
        let twilioCode = "";
        try {
          const errJson = JSON.parse(errText) as { code?: number; message?: string };
          twilioCode = String(errJson.code ?? "");
          if (errJson.code === 21422) userMessage = "This phone number is not available for purchase.";
          else if (errJson.code === 21452) userMessage = "Your Twilio account is not authorized to purchase numbers in this country. Check your Twilio regulatory bundle.";
          else if (errJson.code === 21606) userMessage = "This number is not available. Please try a different number.";
          else if (errJson.code === 20003) userMessage = "Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.";
          else if (errJson.code === 20404) userMessage = "Twilio account not found. Verify your Account SID.";
          else if (errJson.code === 21215 || errJson.code === 21218) userMessage = "Your Twilio account does not have permission to purchase phone numbers. You may need to upgrade from a trial account or complete identity verification.";
          else if (errJson.message) userMessage = errJson.message;
        } catch {
          // Not JSON — use generic message
        }

        return NextResponse.json(
          { error: userMessage, twilio_code: twilioCode, details: errText.slice(0, 300) },
          { status: 400 }
        );
      }
      const purchaseData = (await purchaseRes.json()) as { sid?: string };
      providerSid = purchaseData.sid ?? null;
    } catch (e) {
      console.error("Twilio provisioning failed:", e);
      return NextResponse.json({ error: "Provisioning failed. Try again later." }, { status: 500 });
    }
  }

  const { data: existing } = await db
    .from("phone_numbers")
    .select("id")
    .eq("phone_number", e164)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "This number is already provisioned to a workspace." }, { status: 409 });
  }

  // Pricing: $3/mo local, $5/mo toll-free (Twilio cost ~$1.15/$2.15 → healthy margin)
  const monthlyCost = number_type === "toll_free" ? 500 : 300;
  const setupFeeCents = 100; // $1.00 one-time setup fee
  const { data: inserted, error } = await db
    .from("phone_numbers")
    .insert({
      workspace_id: session.workspaceId,
      phone_number: e164,
      friendly_name: friendly_name ?? e164,
      country_code: country || "US",
      number_type: number_type ?? "local",
      capabilities: { voice: true, sms: true, mms: false },
      provider: "twilio",
      provider_sid: providerSid,
      status: "active",
      monthly_cost_cents: monthlyCost,
      setup_fee_cents: setupFeeCents,
      updated_at: new Date().toISOString(),
    })
    .select("id, phone_number, friendly_name, number_type, status, monthly_cost_cents, setup_fee_cents")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to save number." }, { status: 500 });
  }

  // Bill setup fee via Stripe if customer exists
  if (setupFeeCents > 0) {
    try {
      const { data: wsData } = await db
        .from("workspaces")
        .select("stripe_customer_id")
        .eq("id", session.workspaceId)
        .maybeSingle();
      const stripeCustomerId = (wsData as { stripe_customer_id?: string } | null)?.stripe_customer_id;
      if (stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: "2024-12-18.acacia" as unknown as import("stripe").Stripe.StripeConfig["apiVersion"],
        });
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          amount: setupFeeCents,
          currency: "usd",
          description: `Phone number setup fee: ${e164}`,
          metadata: { workspace_id: session.workspaceId, type: "phone_setup_fee" },
        });
      }
    } catch (err) {
      console.error("[provision] Setup fee billing failed:", err instanceof Error ? err.message : err);
      // Non-blocking — number is provisioned even if billing fails
    }
  }

  // Set as primary workspace number if no config or no proxy yet (so Settings > Phone shows it)
  const { data: existingConfig } = await db
    .from("phone_configs")
    .select("id, proxy_number")
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();
  const cfg = existingConfig as { proxy_number?: string | null } | null;
  if (!cfg?.proxy_number) {
    const { error: configErr } = await db.from("phone_configs").upsert(
      {
        workspace_id: session.workspaceId,
        mode: "direct",
        proxy_number: e164,
        twilio_account_sid: accountSid ?? null,
        twilio_phone_sid: providerSid,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );
    if (configErr) {
      console.error("[provision] phone_configs upsert failed:", configErr);
    }
  }

  return NextResponse.json({
    id: (inserted as { id: string }).id,
    phone_number: (inserted as { phone_number: string }).phone_number,
    friendly_name: (inserted as { friendly_name?: string }).friendly_name,
    number_type: (inserted as { number_type: string }).number_type,
    status: (inserted as { status: string }).status,
    monthly_cost_cents: (inserted as { monthly_cost_cents: number }).monthly_cost_cents,
    setup_fee_cents: (inserted as { setup_fee_cents: number }).setup_fee_cents,
  });
}
