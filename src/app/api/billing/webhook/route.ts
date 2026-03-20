/**
 * Stripe webhook: subscription created/updated/deleted.
 * Signature verified; handlers are idempotent (replay = same DB state).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { logWebhookFailure } from "@/lib/reliability/logging";
import { log } from "@/lib/logger";
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
import { sendDunningEmail } from "@/lib/email/dunning";
import { getTelephonyService } from "@/lib/telephony";
import { creditMinutePack, MINUTE_PACKS } from "@/lib/voice/billing";
import { buildMinutePackEmail } from "@/lib/email/templates";

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

  // Idempotency: SELECT before INSERT (no catch-based 23505 handling).
  const { data: existingEvent } = await db
    .from("webhook_events")
    .select("id, processed")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEvent?.processed) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  // Only create the record if it doesn't exist. If a race occurs and we fail to insert,
  // we re-check processed state to avoid double-processing.
  if (!existingEvent) {
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
      const { data: existingAfter } = await db
        .from("webhook_events")
        .select("processed")
        .eq("event_id", eventId)
        .maybeSingle();
      if (existingAfter?.processed) {
        return NextResponse.json({ received: true, skipped: "already_processed" }, { status: 200 });
      }
      log("error", "billing_webhook.event_insert_failed", { error: String(insertError) });
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  try {
    await handleStripeWebhookEvent(db, event, eventId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("error", "billing_webhook.handler_failed", { event_id: eventId, error: errMsg });
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

      // ── Handle one-time minute pack purchases ──
      if (session.metadata?.type === "minute_pack" && workspaceId) {
        const packId = session.metadata.pack_id;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as { id?: string } | null)?.id ?? session.id;
        if (packId) {
          try {
            const { credited, minutes } = await creditMinutePack(workspaceId, packId, paymentIntentId);
            if (credited) {
              logWebhookEvent("minute_pack_credited", workspaceId, "success", { pack_id: packId, minutes });

              // Send confirmation email
              try {
                const { data: wsRow } = await db
                  .from("workspaces")
                  .select("owner_id, name")
                  .eq("id", workspaceId)
                  .maybeSingle();
                const ownerId = (wsRow as { owner_id?: string } | null)?.owner_id;
                if (ownerId) {
                  const { data: userRow } = await db
                    .from("users")
                    .select("email, full_name")
                    .eq("id", ownerId)
                    .maybeSingle();
                  const ownerEmail = (userRow as { email?: string } | null)?.email;
                  const ownerName = (userRow as { full_name?: string } | null)?.full_name;
                  if (ownerEmail && process.env.RESEND_API_KEY) {
                    const pack = MINUTE_PACKS.find((p) => p.id === packId);
                    // Get updated bonus balance
                    const { data: balRow } = await db
                      .from("workspace_minute_balance")
                      .select("bonus_minutes")
                      .eq("workspace_id", workspaceId)
                      .maybeSingle();
                    const newBalance = (balRow as { bonus_minutes?: number } | null)?.bonus_minutes ?? minutes;

                    const { subject, html } = buildMinutePackEmail({
                      name: ownerName ?? (wsRow as { name?: string } | null)?.name ?? "there",
                      minutes,
                      price: pack?.price_display ?? `$${(session.amount_total ?? 0) / 100}`,
                      newBalance,
                    });

                    const emailFrom = process.env.EMAIL_FROM ?? "Recall Touch <noreply@recall-touch.com>";
                    await fetch("https://api.resend.com/emails", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                      },
                      body: JSON.stringify({ from: emailFrom, to: ownerEmail, subject, html }),
                    });
                  }
                }
              } catch (emailErr) {
                // Non-critical: log but don't fail the webhook
                log("error", "billing_webhook.minute_pack_email_failed", {
                  workspace_id: workspaceId,
                  error: emailErr instanceof Error ? emailErr.message : String(emailErr),
                });
              }
            } else {
              logWebhookEvent("minute_pack_duplicate", workspaceId, "success", { pack_id: packId, message: "already credited" });
            }
          } catch (e) {
            logWebhookEvent("minute_pack_credit_failed", workspaceId, "error", { pack_id: packId, error: String(e) });
          }
        }
        break;
      }

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
          log("warn", "billing_webhook.no_subscription", { workspace_id: workspaceId, message: "checkout.session.completed has no subscription" });
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
          trial_ends_at: trialEndAt?.toISOString() ?? null,
          trial_end_at: trialEndAt?.toISOString() ?? null,
          renews_at: renewsAt?.toISOString() ?? null,
          stripe_subscription_id: sub.id,
          ...(customerId ? { stripe_customer_id: customerId } : {}),
          status: "active",
          paused_at: null,
          pause_reason: null,
          pending_billing_tier: null,
          pending_billing_effective_at: null,
          dunning_amount_due_cents: null,
          dunning_currency: null,
          dunning_next_retry_at: null,
          dunning_failure_count: 0,
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
          trial_ends_at: trialEndAt?.toISOString() ?? null,
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

        if (numbers && numbers.length > 0) {
          const telephony = getTelephonyService();
          for (const num of numbers as Array<{ id: string; provider_sid: string | null }>) {
            if (num.provider_sid) {
              try {
                                const res = await telephony.releaseNumber(num.provider_sid);
                if ("error" in res) {
                  log("error", "billing_webhook.release_number_failed", { provider_sid: num.provider_sid, error: res.error });
                }
} catch (e) {
                log("error", "billing_webhook.release_number_error", { provider_sid: num.provider_sid, error: e instanceof Error ? e.message : String(e) });
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
          log("error", "billing_webhook.background_task_failed", { error: err instanceof Error ? err.message : String(err) });
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
            log("error", "billing_webhook.background_task_failed", { error: err instanceof Error ? err.message : String(err) });
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
          const { data: ws } = await db
            .from("workspaces")
            .select("pending_billing_tier, pending_billing_effective_at")
            .eq("id", workspaceId)
            .maybeSingle();
          const pendingTier = (ws as { pending_billing_tier?: string | null } | null)?.pending_billing_tier ?? null;
          const pendingEffectiveAt = (ws as { pending_billing_effective_at?: string | null } | null)?.pending_billing_effective_at ?? null;
          const shouldApplyPendingTier =
            Boolean(pendingTier) &&
            Boolean(pendingEffectiveAt) &&
            new Date(pendingEffectiveAt as string).getTime() <= Date.now();
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
                ...(shouldApplyPendingTier ? { billing_tier: pendingTier } : {}),
                ...(shouldApplyPendingTier ? { pending_billing_tier: null, pending_billing_effective_at: null } : {}),
                dunning_amount_due_cents: null,
                dunning_currency: null,
                dunning_next_retry_at: null,
                dunning_failure_count: 0,
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

        if (customerEmail) {
          // Non-blocking: email delivery happens via the send queue.
          void sendDunningEmail(workspaceId, customerEmail.trim().toLowerCase(), failureNumber);
        }

        // Day-7 (4th failure): mark billing state to trigger in-app banner.
        if (failureNumber >= 4) {
          await db.from("workspaces").update({
            status: "payment_failed",
            billing_status: "payment_failed",
            updated_at: new Date().toISOString(),
          }).eq("id", workspaceId);
        }

        const dueAt = invoice.due_date
          ? new Date(invoice.due_date * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const nextRetryAt =
          typeof (invoice as Stripe.Invoice & { next_payment_attempt?: number | null }).next_payment_attempt === "number"
            ? new Date(
                ((invoice as Stripe.Invoice & { next_payment_attempt?: number | null }).next_payment_attempt as number) * 1000,
              ).toISOString()
            : null;
        await db
          .from("workspaces")
          .update({
            dunning_amount_due_cents: invoice.amount_due ?? 0,
            dunning_currency: (invoice.currency ?? "usd").toLowerCase(),
            dunning_next_retry_at: nextRetryAt,
            dunning_failure_count: failureNumber,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspaceId);
        createPaymentObligation({
          workspaceId,
          subjectType: "subscription",
          subjectId: invoice.id,
          amount: invoice.amount_due ?? 0,
          currency: (invoice.currency ?? "usd").toLowerCase(),
          dueAt,
        }).catch((err) => {
          log("error", "billing_webhook.background_task_failed", { error: err instanceof Error ? err.message : String(err) });
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
            log("error", "billing_webhook.background_task_failed", { error: err instanceof Error ? err.message : String(err) });
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
