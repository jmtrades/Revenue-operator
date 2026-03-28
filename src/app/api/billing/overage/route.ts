/**
 * Billing overage charges endpoint
 * POST /api/billing/overage
 * Called by cron at end of billing period to create Stripe invoice items for overage
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/lib/db/queries";
import { calculateOverageCharges } from "@/lib/billing/overage";
import { assertCronAuthorized } from "@/lib/runtime";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const authErr = assertCronAuthorized(req);
    if (authErr) return authErr;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as unknown as Stripe.StripeConfig["apiVersion"],
    });

    const db = getDb();

    // Get all workspaces with active subscriptions
    const { data: workspaces } = await db
      .from("workspaces")
      .select("id, stripe_subscription_id, stripe_customer_id, billing_tier, renews_at")
      .eq("billing_status", "active")
      .not("stripe_subscription_id", "is", null);

    if (!workspaces || workspaces.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;
    let phonesBilled = 0;
    const errors: Array<{ workspace_id: string; error: string }> = [];

    for (const ws of workspaces) {
      const wsData = ws as {
        id: string;
        stripe_subscription_id?: string | null;
        stripe_customer_id?: string | null;
        billing_tier?: string;
        renews_at?: string | null;
      };

      try {
        // Calculate billing period
        const now = new Date();
        const billingPeriodEnd = new Date(wsData.renews_at ?? now);
        const billingPeriodStart = new Date(billingPeriodEnd);
        billingPeriodStart.setMonth(billingPeriodStart.getMonth() - 1);

        // Process if renewal is within next 7 days (widened from 3 to avoid missed charges)
        const daysUntilRenewal = (billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntilRenewal > 7 || daysUntilRenewal < -1) {
          continue;
        }

        if (!wsData.stripe_customer_id) continue;

        // Idempotency key scoped to workspace + billing period to prevent duplicate charges
        const periodKey = billingPeriodEnd.toISOString().split("T")[0];
        const idempotencyBase = `overage-${wsData.id}-${periodKey}`;

        const charges = await calculateOverageCharges(
          wsData.id,
          billingPeriodStart,
          billingPeriodEnd
        );

        if (charges && charges.overage_amount_cents > 0 && charges.subscription_id) {
          // Build itemized description for invoice
          const descParts: string[] = [];
          if (charges.overage_minutes > 0) {
            descParts.push(
              `Call overage: ${charges.overage_minutes} min × $${(charges.rate_per_minute_cents / 100).toFixed(2)}/min`
            );
          }
          if (charges.overage_voice_minutes > 0) {
            descParts.push(
              `Voice AI overage: ${charges.overage_voice_minutes} min × $${(charges.rate_per_voice_minute_cents / 100).toFixed(2)}/min`
            );
          }

          await stripe.invoiceItems.create({
            customer: wsData.stripe_customer_id,
            amount: charges.overage_amount_cents,
            currency: "usd",
            description: descParts.join("; ") || "Usage overage",
            metadata: {
              workspace_id: wsData.id,
              overage_minutes: String(charges.overage_minutes),
              overage_voice_minutes: String(charges.overage_voice_minutes),
              billing_period_end: billingPeriodEnd.toISOString(),
            },
          }, {
            idempotencyKey: idempotencyBase,
          });

          processed++;
        }

        // Bill monthly phone number costs
        const { data: activePhones } = await db
          .from("phone_numbers")
          .select("id, phone_number, monthly_cost_cents")
          .eq("workspace_id", wsData.id)
          .eq("status", "active");

        if (activePhones && activePhones.length > 0) {
          const totalPhoneCostCents = (activePhones as { monthly_cost_cents: number }[])
            .reduce((sum, p) => sum + (p.monthly_cost_cents ?? 0), 0);

          if (totalPhoneCostCents > 0) {
            const phoneNumbers = (activePhones as { phone_number: string }[])
              .map((p) => p.phone_number)
              .join(", ");

            await stripe.invoiceItems.create({
              customer: wsData.stripe_customer_id,
              amount: totalPhoneCostCents,
              currency: "usd",
              description: `Phone number monthly charges (${activePhones.length} number${activePhones.length > 1 ? "s" : ""}): ${phoneNumbers}`,
              metadata: {
                workspace_id: wsData.id,
                type: "phone_monthly",
                phone_count: String(activePhones.length),
                billing_period_end: billingPeriodEnd.toISOString(),
              },
            }, {
              idempotencyKey: `phone-monthly-${wsData.id}-${periodKey}`,
            });

            phonesBilled += activePhones.length;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({
          workspace_id: wsData.id,
          error: msg,
        });
      }
    }

    // Always log billing operations for observability — critical for revenue tracking
    if (errors.length > 0) {
      console.error(`[billing/overage] ${errors.length} errors:`, errors);
    }

    return NextResponse.json({
      ok: true,
      processed,
      phones_billed: phonesBilled,
      errors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[billing/overage] Unexpected error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
