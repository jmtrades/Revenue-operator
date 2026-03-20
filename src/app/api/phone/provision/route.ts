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
import { checkRateLimit } from "@/lib/rate-limit";
import { getTelephonyProvider } from "@/lib/telephony/get-telephony-provider";
import { getTelephonyService } from "@/lib/telephony";
import { purchaseTelnyxPhoneNumber } from "@/lib/telephony/telnyx/numbers";

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

  // Rate limit provisioning requests per workspace.
  const rl = await checkRateLimit(`phone-provision:${session.workspaceId}`, 5, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many provisioning attempts" }, { status: 429 });
  }

  const db = getDb();

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
  const telephonyProvider = getTelephonyProvider();
  const voiceWebhookUrl =
    process.env.VOICE_PROVIDER === "pipecat"
      ? `${baseUrl}/api/voice/connect`
      : `${baseUrl}/api/webhooks/twilio/voice`;

  let providerSid: string | null = null;
  if (telephonyProvider === "telnyx") {
    try {
      const { providerSid: telnyxSid } = await purchaseTelnyxPhoneNumber({
        phoneNumberE164: e164,
        countryCode: country || "US",
        phoneType: (number_type ?? "local") as "local" | "toll_free" | "mobile",
      });

      providerSid = telnyxSid;
      if (!providerSid) {
        return NextResponse.json(
          {
            error: "Phone number purchase failed. This is temporary — try again in a few minutes.",
            code: "TELNYX_TEMPORARY_FAILURE",
          },
          { status: 502 },
        );
      }
    } catch (err) {
      console.error("[provision] Telnyx purchase failed:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        {
          error: "Phone number purchase failed. This is temporary — try again in a few minutes.",
          code: "TELNYX_TEMPORARY_FAILURE",
        },
        { status: 502 },
      );
    }
  } else if (accountSid && authToken) {
    try {
      const telephony = getTelephonyService();
      const digits = e164.replace(/\D/g, "");
      // NANP: +1XXXXXXXXXX => area code is digits[1..3]
      const areaCode = digits.startsWith("1") && digits.length >= 11 ? digits.slice(1, 4) : digits.slice(0, 3);

      const available = await telephony.searchAvailableNumbers({
        areaCode,
        state: undefined,
        limit: 5,
      });

      if ("error" in available) {
        return NextResponse.json({ error: available.error }, { status: 502 });
      }

      const selectedNumber = available.find((n) => n.phone_number === e164)?.phone_number ?? e164;
      const purchased = await telephony.purchaseNumber(selectedNumber);

      if ("error" in purchased) {
        return NextResponse.json({ error: purchased.error }, { status: 502 });
      }

      providerSid = purchased.numberId;
    } catch (e) {
      console.error("Telephony provisioning failed:", e);
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
      provider: telephonyProvider,
      provider_sid: providerSid,
      status: "active",
      monthly_cost_cents: monthlyCost,
      setup_fee_cents: setupFeeCents,
      updated_at: new Date().toISOString(),
    })
    .select("id, phone_number, friendly_name, number_type, status, monthly_cost_cents, setup_fee_cents")
    .maybeSingle();

  if (error || !inserted) {
    console.error("[provision] DB insert failed:", error?.message ?? "inserted is null");
    return NextResponse.json({ error: "Failed to save number." }, { status: 500 });
  }

  const row = inserted as {
    id: string;
    phone_number: string;
    friendly_name?: string;
    number_type: string;
    status: string;
    monthly_cost_cents: number;
    setup_fee_cents?: number;
  };

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
        twilio_account_sid: telephonyProvider === "twilio" ? accountSid ?? null : null,
        twilio_phone_sid: telephonyProvider === "twilio" ? providerSid : null,
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
    id: row.id,
    phone_number: row.phone_number,
    friendly_name: row.friendly_name,
    number_type: row.number_type,
    status: row.status,
    monthly_cost_cents: row.monthly_cost_cents,
    setup_fee_cents: row.setup_fee_cents ?? setupFeeCents,
  });
}
