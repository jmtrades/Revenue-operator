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

export async function POST(req: NextRequest) {
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

        // Only process if renewal is within next 3 days
        const daysUntilRenewal = (billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntilRenewal > 3 || daysUntilRenewal < 0) {
          continue;
        }

        const charges = await calculateOverageCharges(
          wsData.id,
          billingPeriodStart,
          billingPeriodEnd
        );

        if (charges && charges.subscription_id && wsData.stripe_customer_id) {
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
          });

          processed++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({
          workspace_id: wsData.id,
          error: msg,
        });
      }
    }

    console.log(`[billing/overage] Processed ${processed} workspaces for overage charges`);
    if (errors.length > 0) {
      console.error(`[billing/overage] Errors:`, errors);
    }

    return NextResponse.json({
      ok: true,
      processed,
      errors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[billing/overage] Unexpected error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
