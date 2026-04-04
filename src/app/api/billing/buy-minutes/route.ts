/**
 * One-time minute pack purchase via Stripe Checkout (mode: "payment").
 * Creates a checkout session for the selected minute pack.
 * On successful payment, the webhook handler credits the minutes to the workspace.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getMinutePack, MINUTE_PACKS } from "@/lib/voice/billing";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

function localLog(event: string, data: Record<string, unknown>): void {
  if (data.reason || data.error) {
    log("warn", `[billing/buy-minutes] ${event}`, data);
  }
}

/** Build production-safe origin */
function effectiveOrigin(req: NextRequest): string | null {
  const fromReq = new URL(req.url).origin;
  const isLocal = fromReq.includes("localhost") || fromReq.includes("127.0.0.1");
  const isPreview = fromReq.includes("preview") || fromReq.includes("vercel.app");
  if (isLocal || isPreview) return process.env.NEXT_PUBLIC_APP_URL ?? null;
  return fromReq || (process.env.NEXT_PUBLIC_APP_URL ?? null);
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    let body: {
      workspace_id?: string;
      pack_id?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
    }

    const workspaceId = body.workspace_id?.trim();
    const packId = body.pack_id?.trim();

    if (!workspaceId) {
      return NextResponse.json({ ok: false, reason: "workspace_id_required" }, { status: 400 });
    }
    if (!packId) {
      return NextResponse.json({ ok: false, reason: "pack_id_required" }, { status: 400 });
    }

    // Validate pack exists
    const pack = getMinutePack(packId);
    if (!pack) {
      return NextResponse.json(
        { ok: false, reason: "invalid_pack", available: MINUTE_PACKS.map((p) => p.id) },
        { status: 400 },
      );
    }

    // Auth check
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    // Rate limit: 10 purchase attempts per workspace per hour
    const rl = await checkRateLimit(`buy-minutes:${workspaceId}`, 10, 60_000 * 60);
    if (!rl.allowed) {
      const retryAfterSeconds = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.max(0, retryAfterSeconds)) } },
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      localLog("buy_minutes_failed", { reason: "missing_stripe_key" });
      return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
    }

    const origin = effectiveOrigin(req);
    if (!origin) {
      localLog("buy_minutes_failed", { reason: "missing_app_url" });
      return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
    }

    const db = getDb();

    // Get workspace stripe customer
    const { data: ws } = await db
      .from("workspaces")
      .select("stripe_customer_id, billing_status, owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (!ws) {
      return NextResponse.json({ ok: false, reason: "workspace_not_found" }, { status: 404 });
    }

    const wsData = ws as {
      stripe_customer_id?: string | null;
      billing_status?: string;
      owner_id?: string;
    };

    // Must have an active subscription or a Stripe customer ID to buy minute packs
    const hasStripeCustomer = wsData.stripe_customer_id !== null && wsData.stripe_customer_id !== undefined;
    const allowedStatus = wsData.billing_status === "active" || wsData.billing_status === "pending" || wsData.billing_status === "trial" || wsData.billing_status === "trial_ended";
    if (!allowedStatus || !hasStripeCustomer) {
      return NextResponse.json(
        { ok: false, reason: "subscription_required", message: "An active subscription is required to purchase minute packs." },
        { status: 403 },
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);

    // Get or create Stripe customer
    let customerId = wsData.stripe_customer_id ?? null;
    if (!customerId) {
      // Get owner email
      let email = "";
      if (wsData.owner_id) {
        const { data: user } = await db.from("users").select("email").eq("id", wsData.owner_id).maybeSingle();
        email = (user as { email?: string })?.email || "";
      }

      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { workspace_id: workspaceId },
      });
      customerId = customer.id;

      await db
        .from("workspaces")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("id", workspaceId);
    }

    // Create one-time payment checkout session
    const successUrl = `${origin}/app/settings/billing?minutes_purchased=${pack.minutes}&pack=${packId}`;
    const cancelUrl = `${origin}/app/settings/billing?minutes_canceled=1`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment", // One-time purchase, NOT subscription
      metadata: {
        workspace_id: workspaceId,
        pack_id: packId,
        minutes: String(pack.minutes),
        type: "minute_pack",
      },
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pack.price_cents,
            product_data: {
              name: `${pack.minutes} Minute Pack`,
              description: `${pack.minutes} voice minutes for Revenue Operator (${pack.price_display})`,
              metadata: {
                pack_id: packId,
                minutes: String(pack.minutes),
              },
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    localLog("buy_minutes_checkout_created", {
      workspace_id: workspaceId,
      pack_id: packId,
      minutes: pack.minutes,
      price_cents: pack.price_cents,
      session_id: session.id,
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    localLog("buy_minutes_failed", { reason: "unexpected_error", error: errorMessage });
    return NextResponse.json({ ok: false, reason: "unexpected_error" }, { status: 500 });
  }
}

/** GET: return available minute packs for display in UI */
export async function GET() {
  return NextResponse.json({
    ok: true,
    packs: MINUTE_PACKS.map((p) => ({
      id: p.id,
      minutes: p.minutes,
      price_cents: p.price_cents,
      price_display: p.price_display,
      per_minute_cents: p.per_minute_cents,
      savings_pct: p.savings_pct,
      popular: p.popular ?? false,
      best_value: p.best_value ?? false,
    })),
  });
}
