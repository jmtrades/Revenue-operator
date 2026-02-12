/**
 * Stripe webhook: subscription created/updated/deleted
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id;
      if (workspaceId) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const sub = await stripe.subscriptions.retrieve(session.subscription as string) as Stripe.Subscription;
        const periodEnd = (sub as { current_period_end?: number }).current_period_end;
        const renewalAt = periodEnd ? new Date(periodEnd * 1000) : null;
        await db
          .from("workspaces")
          .update({
            billing_status: "active",
            protection_renewal_at: renewalAt?.toISOString() ?? null,
            stripe_subscription_id: sub.id,
            status: "active",
            paused_at: null,
            pause_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspaceId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription & { current_period_end?: number };
      const workspaceId = sub.metadata?.workspace_id;
      if (workspaceId) {
        const renewalAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
        await db
          .from("workspaces")
          .update({
            protection_renewal_at: renewalAt?.toISOString() ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspaceId);
        if (sub.cancel_at_period_end) {
          await db
            .from("workspaces")
            .update({
              status: "paused",
              paused_at: new Date().toISOString(),
              pause_reason: "User paused protection",
              updated_at: new Date().toISOString(),
            })
            .eq("id", workspaceId);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspace_id;
      if (workspaceId) {
        await db
          .from("workspaces")
          .update({
            billing_status: "trial",
            stripe_subscription_id: null,
            status: "paused",
            paused_at: new Date().toISOString(),
            pause_reason: "Coverage ended",
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspaceId);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
