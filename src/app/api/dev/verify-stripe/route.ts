/**
 * Stripe webhook verification self-test endpoint
 * Simulates webhook events to verify billing pipeline
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import Stripe from "stripe";

const DEV_SIM_SECRET = process.env.DEV_SIM_SECRET;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${DEV_SIM_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error("[dev/verify-stripe] JSON parse error:", jsonError);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { workspace_id } = body;
    if (!workspace_id) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const db = getDb();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    try {
    // Get or create customer
    const { data: ws } = await db
      .from("workspaces")
      .select("stripe_customer_id")
      .eq("id", workspace_id)
      .maybeSingle();

    let customerId = (ws as { stripe_customer_id?: string | null })?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { workspace_id },
      });
      customerId = customer.id;
      await db
        .from("workspaces")
        .update({ stripe_customer_id: customerId })
        .eq("id", workspace_id);
    }

    // Create test subscription with trial
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRICE_ID not set" }, { status: 500 });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 14,
      metadata: { workspace_id },
    });

    // Simulate checkout.session.completed (not used, but kept for reference)
    // We'll directly update the workspace instead

    // Call webhook handler logic directly
    const sub = subscription as Stripe.Subscription & { trial_end?: number; current_period_end?: number };
    const trialEnd = sub.trial_end;
    const periodEnd = sub.current_period_end;
    const trialEndAt = trialEnd ? new Date(trialEnd * 1000) : null;
    const renewsAt = subscription.status === "trialing" && trialEnd
      ? new Date(trialEnd * 1000)
      : periodEnd
        ? new Date(periodEnd * 1000)
        : null;

    await db
      .from("workspaces")
      .update({
        billing_status: "trial",
        protection_renewal_at: renewsAt?.toISOString() ?? null,
        trial_end_at: trialEndAt?.toISOString() ?? null,
        renews_at: renewsAt?.toISOString() ?? null,
        stripe_subscription_id: subscription.id,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspace_id);

    // Verify state
    const { data: updated } = await db
      .from("workspaces")
      .select("billing_status, trial_end_at, renews_at, stripe_subscription_id")
      .eq("id", workspace_id)
      .maybeSingle();

      return NextResponse.json({
        success: true,
        subscription_id: subscription.id,
        workspace_state: updated,
        trial_end: trialEndAt?.toISOString(),
        renews_at: renewsAt?.toISOString(),
      });
    } catch (error) {
      // Error response below
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[dev/verify-stripe] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
