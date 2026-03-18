/**
 * Stripe webhook: subscription created/updated/deleted.
 * Signature verified; handlers are idempotent (replay = same DB state).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { logWebhookFailure } from "@/lib/reliability/logging";
import { createPaymentObligation, resolvePaymentObligationsBySubject } from "@/lib/payment-completion";
import {
  ensureSharedTransactionForSubject,
  createAcknowledgementToken,
  buildPublicAckLink,
} from "@/lib/shared-transaction-assurance";
import { activateSettlementFromStripe } from "@/lib/settlement";
import { enqueueSendMessage } from "@/lib/action-queue/send-message";
import { priceIdToTierAndInterval } from "@/lib/stripe-prices";
import Stripe from "stripe";
import { sendEmail } from "@/lib/integrations/email";

// Structured logging for webhook events (errors only in production)
function logWebhookEvent(type: string, workspaceId: string | null, status: "success" | "error", details?: unknown) {
  if (status === "error" || process.env.NODE_ENV === "development") {
    const logData: Record<string, unknown> = {
      type: "webhook_event",
      event_type: type,
      workspace_id: workspaceId,
      status,
      timestamp: new Date().toISOString(),
    };
    if (details) logData.details = details;
    if (status === "error") {
      // Stripe webhook error logged
    } else {
      // Stripe webhook warning
    }
  }
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function appendSettlementWebhookEvent(
  workspaceId: string,
  eventType: "settlement_export_failed",
  payload: Record<string, unknown>
) {
  const db = getDb();
  await db.from("protocol_events").insert({
    external_ref: `settle:${workspaceId}:webhook`,
    workspace_id: workspaceId,
    event_type: eventType,
    payload,
  });
}

async function getSettlementWorkspaceIdBySubscriptionId(subscriptionId: string): Promise<string | null> {
  const db = getDb();
  const { data: row } = await db
    .from("settlement_accounts")
    .select("workspace_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  return (row as { workspace_id: string } | null)?.workspace_id ?? null;
}

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    logWebhookEvent("webhook_no_secret", null, "error");
    // Never process webhooks without signature verification
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    logWebhookEvent("webhook_no_stripe_key", null, "error");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeKey);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    logWebhookFailure("stripe", e);
    logWebhookEvent("webhook_signature_failed", null, "error", { error: String(e) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb();
  const eventId = event.id;

  const { error: insertError } = await db
    .from("webhook_events")
    .insert({
      event_id: eventId,
      event_type: event.type,
      payload: event.data.object,
      processed: false,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, skipped: "duplicate" }, { status: 200 });
    }
    console.error("Webhook event insert failed:", insertError);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  try {
    await handleStripeWebhookEvent(db, event, eventId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] handler failed for ${eventId}: ${errMsg}`);
    try {
      await db.from("system_webhook_failures").insert({
        provider: "stripe",
        event_id: eventId,
        error: errMsg,
      });
    } catch { /* Don't let failure tracking crash the response */ }
    // Return 500 so Stripe retries the webhook
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleStripeWebhookEvent(
  db: ReturnType<typeof getDb>,
  event: Stripe.Event,
  eventId: string
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.client_reference_id ?? session.metadata?.workspace_id;
      const isSettlement = session.metadata?.settlement === "true";
      if (workspaceId && isSettlement && session.subscription && session.customer) {
        await activateSettlementFromStripe(
          workspaceId,
          typeof session.customer === "string" ? session.customer : session.customer.id,
          typeof session.subscription === "string" ? session.subscription : session.subscription.id
        );
      } else if (workspaceId && !isSettlement) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!subId) {
          console.warn(`[billing-webhook] checkout.session.completed for workspace ${workspaceId} has no subscription — skipping`);
          break;
        }
        const { data: existing } = await db
          .from("workspaces")
          .select("stripe_subscription_id, billing_status")
          .eq("id", workspaceId)
          .maybeSingle();
        const existingRow = existing as { stripe_subscription_id?: string | null; billing_status?: string } | null;
        if (existingRow?.stripe_subscription_id === subId && (existingRow.billing_status === "trial" || existingRow.billing_status === "active")) {
          break;
        }
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const sub = await stripe.subscriptions.retrieve(subId);
        const isTrialing = sub.status === "trialing";
        const trialEnd = (sub as Stripe.Subscription & { trial_end?: number }).trial_end;
        const periodEnd = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
        const trialEndAt = trialEnd ? new Date(trialEnd * 1000) : null;
        const renewsAt = isTrialing && trialEnd
          ? new Date(trialEnd * 1000)
          : periodEnd
            ? new Date(periodEnd * 1000)
            : null;
        const firstPriceId = sub.items?.data?.[0]?.price
          ? (typeof sub.items.data[0].price === "string" ? sub.items.data[0].price : sub.items.data[0].price?.id)
          : null;
        const tierInterval = priceIdToTierAndInterval(firstPriceId);
        const customerId = typeof session.customer === "string" ? session.customer : (session.customer as { id?: string } | null)?.id;
        const updatePayload: Record<string, unknown> = {
          billing_status: isTrialing ? "trial" : "active",
          protection_renewal_at: renewsAt?.toISOString() ?? null,
          trial_end_at: trialEndAt?.toISOString() ?? null,
          renews_at: renewsAt?.toISOString() ?? null,
          stripe_subscription_id: sub.id,
          ...(customerId ? { stripe_customer_id: customerId } : {}),
          status: "active",
          paused_at: null,
          pause_reason: null,
          updated_at: new Date().toISOString(),
        };
        if (tierInterval) {
          updatePayload.billing_tier = tierInterval.tier;
          updatePayload.billing_interval = tierInterval.interval;
        }
        await db.from("workspaces").update(updatePayload).eq("id", workspaceId);
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
        const firstPriceId = sub.items?.data?.[0]?.price
          ? (typeof sub.items.data[0].price === "string" ? sub.items.data[0].price : sub.items.data[0].price?.id)
          : null;
        const tierInterval = priceIdToTierAndInterval(firstPriceId);
        const updatePayload: Record<string, unknown> = {
          billing_status: isTrialing ? "trial" : sub.status === "active" ? "active" : "paused",
          protection_renewal_at: renewsAt?.toISOString() ?? null,
          trial_end_at: trialEndAt?.toISOString() ?? null,
          renews_at: renewsAt?.toISOString() ?? null,
          updated_at: new Date().toISOString(),
        };
        if (tierInterval) {
          updatePayload.billing_tier = tierInterval.tier;
          updatePayload.billing_interval = tierInterval.interval;
        }
        await db.from("workspaces").update(updatePayload).eq("id", workspaceId);
        // If billing returns to active, resume call handling (undo grace/expired).
        if (sub.status === "active") {
          await db
            .from("workspaces")
            .update({ status: "active", paused_at: null, pause_reason: null, updated_at: new Date().toISOString() })
            .eq("id", workspaceId);
        }
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
      const settlementWorkspaceId = sub.metadata?.workspace_id ?? await getSettlementWorkspaceIdBySubscriptionId(sub.id);
      if (settlementWorkspaceId) {
        const badStatuses = ["canceled", "unpaid", "incomplete_expired"];
        if (badStatuses.includes(sub.status ?? "")) {
          const now = new Date().toISOString();
          const { data: ac } = await db
            .from("settlement_accounts")
            .select("suspension_entry_created_at")
            .eq("workspace_id", settlementWorkspaceId)
            .maybeSingle();
          const alreadyCreated = (ac as { suspension_entry_created_at: string | null } | null)?.suspension_entry_created_at != null;
          await db
            .from("settlement_accounts")
            .update({
              settlement_state: "suspended",
              suspended_at: now,
              updated_at: now,
              ...(!alreadyCreated && { suspension_entry_created_at: now }),
            })
            .eq("workspace_id", settlementWorkspaceId);
          await appendSettlementWebhookEvent(settlementWorkspaceId, "settlement_export_failed", { reason: "subscription_not_active" });
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

        const { data: numbers } = await db
          .from("phone_numbers")
          .select("id, provider_sid")
          .eq("workspace_id", workspaceId)
          .eq("status", "active");

        if (numbers && numbers.length > 0 && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          const sid = process.env.TWILIO_ACCOUNT_SID;
          const token = process.env.TWILIO_AUTH_TOKEN;
          for (const num of numbers as Array<{ id: string; provider_sid: string | null }>) {
            if (num.provider_sid) {
              try {
                await fetch(
                  `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers/${num.provider_sid}.json`,
                  {
                    method: "DELETE",
                    headers: {
                      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
                    },
                  }
                );
              } catch (e) {
                console.error("Failed to release number:", num.provider_sid, e);
              }
            }
          }
          await db
            .from("phone_numbers")
            .update({ status: "released" })
            .eq("workspace_id", workspaceId)
            .eq("status", "active");
        }
      }
      break;
    }
    case "invoice.created": {
      const invCreated = event.data.object as Stripe.Invoice & { due_date?: number | null };
      const workspaceId = invCreated.metadata?.workspace_id;
      if (workspaceId && (invCreated.amount_due ?? 0) > 0) {
        const dueAt = invCreated.due_date
          ? new Date(invCreated.due_date * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        createPaymentObligation({
          workspaceId,
          subjectType: "invoice",
          subjectId: invCreated.id,
          amount: invCreated.amount_due ?? 0,
          currency: (invCreated.currency ?? "usd").toLowerCase(),
          dueAt,
        }).catch((err) => {
          console.error("Billing webhook background task failed:", err);
        });
        const customerEmail =
          typeof (invCreated as Stripe.Invoice).customer_email === "string"
            ? (invCreated as Stripe.Invoice).customer_email
            : null;
        if (customerEmail) {
          ensureSharedTransactionForSubject({
            workspaceId,
            subjectType: "payment",
            subjectId: invCreated.id,
            counterpartyIdentifier: customerEmail.trim().toLowerCase(),
            deadlineAt: dueAt,
            initiatedBy: "business",
          }).then(async (txId) => {
            if (!txId) return;
            const { data: lead } = await db
              .from("leads")
              .select("id")
              .eq("workspace_id", workspaceId)
              .eq("email", customerEmail.trim().toLowerCase())
              .limit(1)
              .maybeSingle();
            const leadId = (lead as { id: string } | null)?.id ?? null;
            if (!leadId) return;
            const { data: conv } = await db
              .from("conversations")
              .select("id, channel")
              .eq("lead_id", leadId)
              .limit(1)
              .maybeSingle();
            if (!conv) return;
            const c = conv as { id: string; channel: string };
            const { rawToken } = await createAcknowledgementToken(txId);
            const link = buildPublicAckLink(rawToken);
            await enqueueSendMessage(
              workspaceId,
              leadId,
              c.id,
              c.channel || "sms",
              link,
              `payment-ack:${workspaceId}:${invCreated.id}`
            );
          }).catch((err) => {
            console.error("Billing webhook background task failed:", err);
          });
        }
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
      const workspaceId = invoice.metadata?.workspace_id;
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription && typeof invoice.subscription === "object"
          ? invoice.subscription.id
          : null;
      const settlementWid = workspaceId ?? (subscriptionId ? await getSettlementWorkspaceIdBySubscriptionId(subscriptionId) : null);
      if (settlementWid) {
        const { data: acc } = await db
          .from("settlement_accounts")
          .select("settlement_state")
          .eq("workspace_id", settlementWid)
          .maybeSingle();
        if ((acc as { settlement_state: string } | null)?.settlement_state === "suspended") {
          const subActive = subscriptionId
            ? (async () => {
                try {
                  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
                  const sub = await stripe.subscriptions.retrieve(subscriptionId);
                  return sub.status === "active" || sub.status === "trialing";
                } catch {
                  return false;
                }
              })()
            : Promise.resolve(false);
          if (await subActive) {
            const now = new Date().toISOString();
            await db
              .from("settlement_accounts")
              .update({
                settlement_state: "active",
                suspended_at: null,
                updated_at: now,
              })
              .eq("workspace_id", settlementWid);
          }
        }
      }
      if (workspaceId) {
        await resolvePaymentObligationsBySubject(workspaceId, "subscription", invoice.id, "paid");
        await resolvePaymentObligationsBySubject(workspaceId, "invoice", invoice.id, "paid");
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
      const invoice = event.data.object as Stripe.Invoice & { due_date?: number | null; subscription?: string | null };
      const workspaceId = invoice.metadata?.workspace_id;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      const settlementWid = workspaceId ?? (subId ? await getSettlementWorkspaceIdBySubscriptionId(subId) : null);
      if (settlementWid) {
        await appendSettlementWebhookEvent(settlementWid, "settlement_export_failed", { reason: "invoice_payment_failed" });
      }
      if (workspaceId) {
        const { count: prevFailureCount } = await db
          .from("webhook_events")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("event_type", "invoice.payment_failed")
          .eq("processed", true);

        const failureNumber = (prevFailureCount ?? 0) + 1;
        const customerEmail =
          typeof (invoice as Stripe.Invoice).customer_email === "string"
            ? (invoice as Stripe.Invoice).customer_email
            : null;

        const paymentFailedText = "Your payment failed. Please update your payment method to continue service.";
        const impendingPauseText = "Your account will be paused in 48 hours unless payment is updated.";

        if (customerEmail) {
          // Non-blocking: email delivery happens via the send queue.
          void sendEmail(workspaceId, customerEmail.trim().toLowerCase(), "Payment failed", `<p>${paymentFailedText}</p>`).catch(
            () => {}
          );
          if (failureNumber === 3) {
            void sendEmail(
              workspaceId,
              customerEmail.trim().toLowerCase(),
              "Action required: payment update",
              `<p>${impendingPauseText}</p>`
            ).catch(() => {});
          }
        }

        const pauseNow = failureNumber >= 4;
        await db
          .from("workspaces")
          .update({
            status: pauseNow ? "paused" : undefined,
            billing_status: pauseNow ? "paused" : "payment_failed",
            paused_at: pauseNow ? new Date().toISOString() : undefined,
            pause_reason: pauseNow ? "Billing dunning: repeated payment failures" : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspaceId);

        const dueAt = invoice.due_date
          ? new Date(invoice.due_date * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        createPaymentObligation({
          workspaceId,
          subjectType: "subscription",
          subjectId: invoice.id,
          amount: invoice.amount_due ?? 0,
          currency: (invoice.currency ?? "usd").toLowerCase(),
          dueAt,
        }).catch((err) => {
          console.error("Billing webhook background task failed:", err);
        });
        if (customerEmail) {
          ensureSharedTransactionForSubject({
            workspaceId,
            subjectType: "payment",
            subjectId: invoice.id,
            counterpartyIdentifier: customerEmail.trim().toLowerCase(),
            deadlineAt: dueAt,
            initiatedBy: "business",
          }).then(async (txId) => {
            if (!txId) return;
            const { data: lead } = await db
              .from("leads")
              .select("id")
              .eq("workspace_id", workspaceId)
              .eq("email", customerEmail.trim().toLowerCase())
              .limit(1)
              .maybeSingle();
            const leadId = (lead as { id: string } | null)?.id ?? null;
            if (!leadId) return;
            const { data: conv } = await db
              .from("conversations")
              .select("id, channel")
              .eq("lead_id", leadId)
              .limit(1)
              .maybeSingle();
            if (!conv) return;
            const c = conv as { id: string; channel: string };
            const { rawToken } = await createAcknowledgementToken(txId);
            const link = buildPublicAckLink(rawToken);
            await enqueueSendMessage(
              workspaceId,
              leadId,
              c.id,
              c.channel || "sms",
              link,
              `payment-ack:${workspaceId}:${invoice.id}`
            );
          }).catch((err) => {
            console.error("Billing webhook background task failed:", err);
          });
        }
      }
      break;
    }
    default:
      break;
  }

  await db
    .from("webhook_events")
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      workspace_id: (event.data.object as { metadata?: { workspace_id?: string } }).metadata?.workspace_id ?? null,
    })
    .eq("event_id", eventId);
}
