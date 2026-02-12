/**
 * Stripe checkout: create session for Continue Coverage
 * 14-day trial, payment method upfront, Apple Pay enabled
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "price_placeholder";

export async function POST(req: NextRequest) {
  let body: { workspace_id: string; success_url?: string; cancel_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id, stripe_customer_id").eq("id", workspaceId).single();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || !STRIPE_PRICE_ID || STRIPE_PRICE_ID === "price_placeholder") {
    return NextResponse.json({
      checkout_url: null,
      message: "Billing not configured. Coverage continues. Contact support to enable.",
    });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000";
  const successUrl = body.success_url ?? `${baseUrl}/dashboard?checkout=success`;
  const cancelUrl = body.cancel_url ?? `${baseUrl}/dashboard/continue-protection`;

  let customerId = (ws as { stripe_customer_id?: string | null }).stripe_customer_id;
  if (!customerId) {
    const { data: owner } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).single();
    const ownerId = (owner as { owner_id?: string })?.owner_id;
    const { data: user } = ownerId ? await db.from("users").select("email").eq("id", ownerId).single() : { data: null };
    const email = (user as { email?: string })?.email ?? undefined;
    const customer = await stripe.customers.create({ email, metadata: { workspace_id: workspaceId } });
    customerId = customer.id;
    await db.from("workspaces").update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() }).eq("id", workspaceId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    metadata: { workspace_id: workspaceId },
    payment_method_collection: "always",
    payment_method_types: ["card"],
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    subscription_data: {
      trial_period_days: 0,
      metadata: { workspace_id: workspaceId },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });

  return NextResponse.json({
    checkout_url: session.url,
    session_id: session.id,
  });
}
