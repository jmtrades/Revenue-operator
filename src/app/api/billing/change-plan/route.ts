/**
 * POST /api/billing/change-plan — Update subscription to a new plan, or start one (trial → checkout).
 * Body: { workspace_id, plan_id?: string, planId?: string } (plan_id or planId).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getPriceId } from "@/lib/stripe-prices";
import { RECEIPT_FOOTER } from "@/lib/billing-copy";
import type { BillingTier } from "@/lib/feature-gate/types";

const PLAN_TO_TIER: Record<string, BillingTier> = {
  starter: "solo",
  growth: "growth",
  scale: "team",
};

function getOrigin(req: NextRequest): string | null {
  const url = new URL(req.url);
  const o = url.origin;
  if (o.includes("localhost") || o.includes("127.0.0.1")) return process.env.NEXT_PUBLIC_APP_URL ?? null;
  return o || (process.env.NEXT_PUBLIC_APP_URL ?? null);
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; plan_id?: string; planId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const planId = body.plan_id ?? body.planId;
  const { workspace_id } = body;
  if (!workspace_id) return NextResponse.json({ ok: false, error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspace_id);
  if (authErr) return authErr;

  if (!planId || typeof planId !== "string") return NextResponse.json({ ok: false, error: "plan_id or planId required" }, { status: 400 });

  const tier = PLAN_TO_TIER[planId.toLowerCase()];
  if (!tier) return NextResponse.json({ ok: false, error: "Invalid plan. Use starter, growth, or scale. For Enterprise contact us." }, { status: 400 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { ok: false, error: "This feature is being configured. Please try again later or contact support." },
      { status: 503 }
    );
  }

  const interval = (body as { interval?: string }).interval ?? "month";
  const priceResult = await getPriceId(tier, interval);
  if (!priceResult.ok) {
    return NextResponse.json(
      { ok: false, error: priceResult.reason === "missing_price_id" ? "Plan not configured" : "Could not resolve price" },
      { status: 400 }
    );
  }

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("id, stripe_subscription_id, stripe_customer_id, owner_id")
    .eq("id", workspace_id)
    .maybeSingle();
  if (!ws) return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });

  const row = ws as { stripe_subscription_id?: string | null; stripe_customer_id?: string | null; owner_id?: string };
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // No subscription yet (trial): create checkout session and return URL
  if (!row.stripe_subscription_id) {
    try {
      const origin = getOrigin(req);
      if (!origin) return NextResponse.json({ ok: false, error: "App URL not configured" }, { status: 400 });

      // Idempotent customer creation pattern (mirrors checkout route)
      let customerId = row.stripe_customer_id ?? null;
      if (!customerId) {
        const ownerId = row.owner_id;
        let email = "";
        if (ownerId) {
          const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
          email = (user as { email?: string } | null)?.email ?? "";
        }

        const customer = await stripe.customers.create({
          email: email || undefined,
          metadata: { workspace_id },
          invoice_settings: { footer: RECEIPT_FOOTER },
        });
        const createdId = customer.id;

        const { data: claimed, error: claimError } = await db
          .from("workspaces")
          .update({ stripe_customer_id: createdId, updated_at: new Date().toISOString() })
          .eq("id", workspace_id)
          .is("stripe_customer_id", null)
          .select("stripe_customer_id")
          .maybeSingle();

        if (claimError) {
          return NextResponse.json(
            { ok: false, error: "Something went wrong with this service. Please try again." },
            { status: 502 },
          );
        }

        if (claimed?.stripe_customer_id) {
          customerId = claimed.stripe_customer_id as string;
        } else {
          const { data: refreshed } = await db
            .from("workspaces")
            .select("stripe_customer_id")
            .eq("id", workspace_id)
            .maybeSingle();
          customerId = (refreshed as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? createdId;
        }
      }
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        metadata: { workspace_id },
        payment_method_collection: "always",
        payment_method_types: ["card"],
        line_items: [{ price: priceResult.price_id, quantity: 1 }],
        subscription_data: {
          trial_period_days: 14,
          metadata: { workspace_id },
        },
        success_url: `${origin}/app/settings/billing?plan_changed=1`,
        cancel_url: `${origin}/app/settings/billing`,
        allow_promotion_codes: true,
      });
      return NextResponse.json({
        ok: true,
        checkout_url: session.url,
        message: "Redirect to checkout to start your plan.",
      });
    } catch (_e) {
      // Stripe error; return below
      return NextResponse.json(
        { ok: false, error: "Something went wrong with this service. Please try again." },
        { status: 502 }
      );
    }
  }

  // Existing subscription: update item
  try {
    const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) return NextResponse.json({ ok: false, error: "Subscription has no items" }, { status: 400 });

    const priceField = sub.items?.data?.[0]?.price;
    const currentPriceId = typeof priceField === "string" ? priceField : priceField?.id;
    if (currentPriceId === priceResult.price_id) {
      return NextResponse.json({ ok: true, reason: "already_on_plan" }, { status: 200 });
    }
    // Prorate on all changes — Stripe handles credit/debit correctly
    await stripe.subscriptions.update(row.stripe_subscription_id, {
      items: [{ id: itemId, price: priceResult.price_id }],
      proration_behavior: "always_invoice",
    });
  } catch (_e) {
    // Stripe update error; return below
    return NextResponse.json(
      { ok: false, error: "Something went wrong with this service. Please try again." },
      { status: 502 }
    );
  }

  await db.from("workspaces").update({ billing_tier: tier }).eq("id", workspace_id);

  return NextResponse.json({
    ok: true,
    message: `Plan changed. Your new features are available now.`,
    plan_id: planId,
    tier,
  });
}
