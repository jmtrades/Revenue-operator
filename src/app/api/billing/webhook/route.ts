/**
 * Stripe webhook: subscription created/updated/deleted.
 * Signature verified; handlers are idempotent (replay = same DB state).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { logWebhookFailure } from "@/lib/reliability/logging";
import Stripe from "stripe";

// Structured logging for webhook events
function logWebhookEvent(type: string, workspaceId: string | null, status: "success" | "error", details?: unknown) {
  const logData: Record<string, unknown> = {
    type: "webhook_event",
    event_type: type,
    workspace_id: workspaceId,
    status,
    timestamp: new Date().toISOString(),
  };
  if (details) {
    logData.details = details;
  }
  console.log(JSON.stringify(logData));
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Production safety: reject unsigned events
  if (!webhookSecret && process.env.NODE_ENV === "production") {
    logWebhookEvent("webhook_no_secret", null, "error");
    return NextResponse.json({ error: "Webhook secret required in production" }, { status: 500 });
  }

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
    logWebhookFailure("stripe", e);
    logWebhookEvent("webhook_signature_failed", null, "error", { error: String(e) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb();

  // Idempotency check: prevent duplicate processing
  const eventId = event.id;
  const { data: existing } = await db
    .from("webhook_events")
    .select("id, processed")
    .eq("event_id", eventId)
    .single();

  if (existing && (existing as { processed?: boolean }).processed) {
    console.log(`[webhook] Event ${eventId} already processed, skipping`);
    return NextResponse.json({ received: true, skipped: "duplicate" }, { status: 200 });
  }

  // Store event for idempotency
  await db.from("webhook_events").upsert(
    {
      event_id: eventId,
      event_type: event.type,
      payload: event.data.object,
      processed: false,
    },
    { onConflict: "event_id" }
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id;
      if (workspaceId) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const isTrialing = sub.status === "trialing";
        const trialEnd = (sub as Stripe.Subscription & { trial_end?: number }).trial_end;
        const periodEnd = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
        const trialEndAt = trialEnd ? new Date(trialEnd * 1000) : null;
        const renewsAt = isTrialing && trialEnd
          ? new Date(trialEnd * 1000)
          : periodEnd
            ? new Date(periodEnd * 1000)
            : null;
        await db
          .from("workspaces")
          .update({
            billing_status: isTrialing ? "trial" : "active",
            protection_renewal_at: renewsAt?.toISOString() ?? null,
            trial_end_at: trialEndAt?.toISOString() ?? null,
            renews_at: renewsAt?.toISOString() ?? null,
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
      const sub = event.data.object as Stripe.Subscription & { current_period_end?: number; trial_end?: number; status?: string };
      const workspaceId = sub.metadata?.workspace_id;
      if (workspaceId) {
        const isTrialing = sub.status === "trialing";
        const trialEnd = sub.trial_end;
        const periodEnd = sub.current_period_end;
        const trialEndAt = trialEnd ? new Date(trialEnd * 1000) : null;
        const renewsAt = isTrialing && trialEnd
          ? new Date(trialEnd * 1000)
          : periodEnd
            ? new Date(periodEnd * 1000)
            : null;
        await db
          .from("workspaces")
          .update({
            billing_status: isTrialing ? "trial" : sub.status === "active" ? "active" : "paused",
            protection_renewal_at: renewsAt?.toISOString() ?? null,
            trial_end_at: trialEndAt?.toISOString() ?? null,
            renews_at: renewsAt?.toISOString() ?? null,
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
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
      const workspaceId = invoice.metadata?.workspace_id;
      if (workspaceId) {
        // Trial ended, subscription now active
        const subscriptionId = typeof invoice.subscription === "string" 
          ? invoice.subscription 
          : invoice.subscription && typeof invoice.subscription === "object" 
            ? invoice.subscription.id 
            : null;
        if (subscriptionId) {
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
          const sub = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription & { current_period_end?: number };
          const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
          await db
            .from("workspaces")
            .update({
              billing_status: "active",
              renews_at: periodEnd?.toISOString() ?? null,
              protection_renewal_at: periodEnd?.toISOString() ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", workspaceId);
        }
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const workspaceId = invoice.metadata?.workspace_id;
      if (workspaceId) {
        // Don't pause immediately - give grace period
        // Set flag for UI to show soft message
        await db
          .from("workspaces")
          .update({
            billing_status: "payment_failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspaceId);
      }
      break;
    }
    default:
      break;
  }

  // Mark event as processed
  await db
    .from("webhook_events")
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      workspace_id: (event.data.object as { metadata?: { workspace_id?: string } }).metadata?.workspace_id ?? null,
    })
    .eq("event_id", eventId);

  return NextResponse.json({ received: true }, { status: 200 });
}
