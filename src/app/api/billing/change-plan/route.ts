/**
 * POST /api/billing/change-plan — Update subscription to a new plan, or start one (trial → checkout).
 * Body: { workspace_id, plan_id: string }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getPriceId } from "@/lib/stripe-prices";
import { RECEIPT_FOOTER } from "@/lib/billing-copy";
import type { BillingTier } from "@/lib/feature-gate/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/billing/stripe-client";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

const PLAN_TO_TIER: Record<string, BillingTier> = {
  solo: "solo",
  starter: "solo", // legacy alias
  business: "business",
  growth: "business", // legacy alias
  scale: "scale",
  team: "scale", // legacy alias
  enterprise: "enterprise",
  agency: "enterprise", // legacy alias
};

const TIER_RANK: Record<BillingTier, number> = {
  solo: 1,
  business: 2,
  scale: 3,
  enterprise: 4,
};

function getOrigin(req: NextRequest): string | null {
  const url = new URL(req.url);
  const o = url.origin;
  if (o.includes("localhost") || o.includes("127.0.0.1")) return process.env.NEXT_PUBLIC_APP_URL ?? null;
  return o || (process.env.NEXT_PUBLIC_APP_URL ?? null);
}

export async function POST(req: NextRequest) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  let body: { workspace_id?: string; plan_id?: string; planId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Spec: accept only `plan_id`. Reject `planId`.
  if (Object.prototype.hasOwnProperty.call(body, "planId") && (body as { planId?: unknown }).planId !== undefined) {
    return NextResponse.json({ ok: false, error: "Use plan_id, not planId" }, { status: 400 });
  }

  const planId = body.plan_id;
  const { workspace_id } = body;
  if (!workspace_id) return NextResponse.json({ ok: false, error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspace_id);
  if (authErr) return authErr;

  // Rate limiting: 5 requests per minute per workspace
  const rl = await checkRateLimit(`billing:change-plan:${workspace_id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  if (!planId || typeof planId !== "string") return NextResponse.json({ ok: false, error: "plan_id required" }, { status: 400 });

  const tier = PLAN_TO_TIER[planId.toLowerCase()];
  if (!tier) return NextResponse.json({ ok: false, error: "Invalid plan. Use starter, growth, scale, or enterprise." }, { status: 400 });

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
    .select("id, stripe_subscription_id, stripe_customer_id, owner_id, billing_tier, billing_status")
    .eq("id", workspace_id)
    .maybeSingle();
  if (!ws) return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });

  const row = ws as {
    stripe_subscription_id?: string | null;
    stripe_customer_id?: string | null;
    owner_id?: string;
    billing_tier?: BillingTier | null;
    billing_status?: string;
  };
  const stripe = getStripe();

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
            { ok: false, error: "Service temporarily unavailable. Please try again." },
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

      // No free trial — users pay from day one after experiencing the demo call
      const trialPeriodDays: number | undefined = undefined;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        metadata: { workspace_id },
        payment_method_collection: "always",
        payment_method_types: ["card"],
        line_items: [{ price: priceResult.price_id, quantity: 1 }],
        subscription_data: {
          ...(trialPeriodDays !== undefined && { trial_period_days: trialPeriodDays }),
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
    } catch (err) {
      log("error", "[change-plan] Stripe checkout session creation failed:", { error: err instanceof Error ? err.message : err });
      return NextResponse.json(
        { ok: false, error: "Could not create checkout session. Please try again or contact support." },
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
      return NextResponse.json({ ok: true, message: "Already on this plan" }, { status: 200 });
    }
    const currentTier = (row.billing_tier ?? "solo") as BillingTier;
    const isDowngrade = TIER_RANK[tier] < TIER_RANK[currentTier];
    const currentPeriodEnd = (sub as { current_period_end?: number }).current_period_end;
    const trialEnd = (sub as { trial_end?: number | null }).trial_end;
    const periodTs = currentPeriodEnd ?? trialEnd;
    const effectiveAt = periodTs ? new Date(periodTs * 1000).toISOString() : new Date().toISOString();

    await stripe.subscriptions.update(row.stripe_subscription_id, {
      items: [{ id: itemId, price: priceResult.price_id }],
      proration_behavior: isDowngrade ? "none" : "create_prorations",
      billing_cycle_anchor: "unchanged",
    });

    if (isDowngrade) {
      await db
        .from("workspaces")
        .update({
          pending_billing_tier: tier,
          pending_billing_effective_at: effectiveAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workspace_id);

      return NextResponse.json({
        ok: true,
        scheduled: true,
        message: `Downgrade scheduled for ${effectiveAt ? new Date(effectiveAt).toLocaleDateString() : "the next billing date"}.`,
        plan_id: planId,
        tier,
        effective_at: effectiveAt,
      });
    }

    // For upgrades, immediately update billing_tier
    await db
      .from("workspaces")
      .update({
        billing_tier: tier,
        pending_billing_tier: null,
        pending_billing_effective_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspace_id);
  } catch (err) {
    log("error", "[change-plan] Stripe subscription update failed:", { error: err instanceof Error ? err.message : err });
    return NextResponse.json(
      { ok: false, error: "Could not update subscription. Please try again or contact support." },
      { status: 502 }
    );
  }

  // Log billing change to audit log
  const oldTier = (row.billing_tier ?? "solo") as string;
  try {
    let userId: string | null = null;
    try {
      const mod = await import("@/lib/auth/request-session");
      const sess = mod.getSession ? await mod.getSession(req) : null;
      userId = (sess as { userId?: string } | null)?.userId ?? null;
    } catch { /* session read failed — continue without userId */ }

    const { error: auditInsertErr } = await db.from("billing_events").insert({
      workspace_id,
      event_type: "plan_change",
      old_tier: oldTier,
      new_tier: tier,
      changed_by: userId,
      timestamp: new Date().toISOString(),
      metadata: {
        from_stripe: true,
        subscription_id: (row as { stripe_subscription_id?: string }).stripe_subscription_id ?? null,
      },
    });
    if (auditInsertErr) {
      log("warn", "[change-plan] Failed to log billing event:", { detail: auditInsertErr.message });
    }
  } catch (auditErr) {
    // Non-blocking: audit log error should not fail the plan change
    log("warn", "[change-plan] Audit log error:", { detail: auditErr instanceof Error ? auditErr.message : auditErr });
  }

  return NextResponse.json({
    ok: true,
    message: `Plan changed. Your new features are available now.`,
    plan_id: planId,
    tier,
  });
}
