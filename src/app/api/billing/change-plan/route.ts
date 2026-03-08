/**
 * POST /api/billing/change-plan — Update subscription to a new plan (Stripe subscription update).
 * Body: { workspace_id, plan_id: "starter" | "growth" | "scale" } (enterprise = contact us, no API).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getPriceId } from "@/lib/stripe-prices";
import type { BillingTier } from "@/lib/feature-gate/types";

const PLAN_TO_TIER: Record<string, BillingTier> = {
  starter: "solo",
  growth: "growth",
  scale: "team",
};

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; plan_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { workspace_id, plan_id } = body;
  if (!workspace_id) return NextResponse.json({ ok: false, error: "workspace_id required" }, { status: 400 });
  if (!plan_id || typeof plan_id !== "string") return NextResponse.json({ ok: false, error: "plan_id required" }, { status: 400 });

  const tier = PLAN_TO_TIER[plan_id.toLowerCase()];
  if (!tier) return NextResponse.json({ ok: false, error: "Invalid plan_id. Use starter, growth, or scale. For Enterprise contact us." }, { status: 400 });

  const priceResult = await getPriceId(tier, "month");
  if (!priceResult.ok) {
    return NextResponse.json(
      { ok: false, error: priceResult.reason === "missing_price_id" ? "Plan not configured" : "Could not resolve price" },
      { status: 400 }
    );
  }

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("id, stripe_subscription_id")
    .eq("id", workspace_id)
    .single();
  if (!ws) return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });

  const row = ws as { stripe_subscription_id?: string | null };
  if (!row.stripe_subscription_id) {
    return NextResponse.json({ ok: false, error: "No active subscription. Start a trial or checkout first." }, { status: 400 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) return NextResponse.json({ ok: false, error: "Subscription has no items" }, { status: 400 });

    await stripe.subscriptions.update(row.stripe_subscription_id, {
      items: [{ id: itemId, price: priceResult.price_id }],
      proration_behavior: "always_invoice",
    });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ ok: false, error: err.message || "Stripe update failed" }, { status: 502 });
  }

  await db.from("workspaces").update({ billing_tier: tier }).eq("id", workspace_id);

  return NextResponse.json({
    ok: true,
    message: `Plan changed to ${tier}. Your new features are available now.`,
    plan_id: plan_id,
    tier,
  });
}
