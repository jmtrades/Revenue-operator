/**
 * Stripe checkout: create session for activation
 * Card charged immediately, 30-day money-back guarantee, USD only
 * Economic framing: use BILLING_EMAIL_SUBJECT and INVOICE_DESCRIPTION in Stripe Product/email settings.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { RECEIPT_FOOTER } from "@/lib/billing-copy";
import { getPriceId } from "@/lib/stripe-prices";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

/** Map plan names (including legacy) to tier names, same as change-plan route */
const PLAN_TO_TIER: Record<string, string> = {
  solo: "solo",
  starter: "solo", // legacy alias
  business: "business",
  growth: "business", // legacy alias
  scale: "scale",
  team: "scale", // legacy alias
  enterprise: "enterprise",
  agency: "enterprise", // legacy alias
};

/** Build production-safe origin: never localhost, never preview. Prefer request origin. */
function effectiveOrigin(req: NextRequest): string | null {
  const fromReq = new URL(req.url).origin;
  const isLocal = fromReq.includes("localhost") || fromReq.includes("127.0.0.1");
  const isPreview = fromReq.includes("preview") || fromReq.includes("vercel.app");
  if (isLocal || isPreview) return process.env.NEXT_PUBLIC_APP_URL ?? null;
  return fromReq || (process.env.NEXT_PUBLIC_APP_URL ?? null);
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    let body: {
      workspace_id?: string;
      email?: string;
      tier?: string;
      interval?: string;
      success_url?: string;
      cancel_url?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
    }

    const planOrTier = (body.tier ?? "solo").toString().trim().toLowerCase() || "solo";
    const tier = PLAN_TO_TIER[planOrTier] || planOrTier; // normalize legacy plan names (growth→business, team→scale, etc.)
    const interval = (body.interval ?? "month").toString().trim().toLowerCase() || "month";

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      log("error", "billing.checkout_failed", { reason: "missing_stripe_key" });
      return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
    }
    const origin = effectiveOrigin(req);
    if (!origin) {
      log("error", "billing.checkout_failed", { reason: "missing_app_url" });
      return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
    }

    const priceResult = await getPriceId(tier, interval);
    if (!priceResult.ok) {
      log("error", "billing.checkout_failed", { reason: priceResult.reason, tier, interval });
      const status =
        priceResult.reason === "invalid_tier" || priceResult.reason === "invalid_interval"
          ? 400
          : priceResult.reason === "stripe_unreachable"
            ? 500
            : priceResult.reason === "missing_price_id" || priceResult.reason === "wrong_price_mode"
              ? 503
              : 500;
      return NextResponse.json({ ok: false, reason: priceResult.reason }, { status });
    }
    const stripePriceId = priceResult.price_id;

    const workspaceId = body.workspace_id?.trim();
    const email = body.email?.trim();

    if (!workspaceId && !email) {
      return NextResponse.json({ ok: false, reason: "workspace_id_or_email_required" }, { status: 400 });
    }

    if (workspaceId) {
      const authErr = await requireWorkspaceAccess(req, workspaceId);
      if (authErr) return authErr;
    } else if (email) {
      // When only email is provided, require user to be authenticated and email verified
      const session = await getSession(req);
      if (!session?.userId) {
        return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
      }
      if (!session.emailVerified) {
        return NextResponse.json({ ok: false, reason: "email_not_verified" }, { status: 403 });
      }
    }

    const db = getDb();
    
    // If workspace_id provided, use it; otherwise create workspace from email
    let finalWorkspaceId = workspaceId;
    let finalEmail = email;
    
    if (!finalWorkspaceId && email) {
      // Check if workspace already exists for this email
      const { data: existingUser } = await db.from("users").select("id").eq("email", email).maybeSingle();
      if (existingUser) {
        const uid = (existingUser as { id: string } | null)?.id;
        if (uid) {
          const { data: existingWs } = await db.from("workspaces").select("id").eq("owner_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (existingWs) {
            finalWorkspaceId = (existingWs as { id: string }).id;
            finalEmail = email;
          }
        }
      }

      // If no existing workspace, create new one
      if (!finalWorkspaceId) {
        const { randomUUID } = await import("crypto");
        const userId = randomUUID();
        const wsId = randomUUID();

        try {
          await db.from("users").insert({
            id: userId,
            email,
            full_name: null,
          });

          await db.from("workspaces").insert({
            id: wsId,
            name: email.split("@")[0] + "'s workspace",
            owner_id: userId,
            autonomy_level: "assisted",
            kill_switch: false,
            billing_status: "pending",
            protection_renewal_at: null,
            trial_ends_at: null,
            trial_end_at: null,
          });

          await db.from("settings").insert({
            workspace_id: wsId,
            risk_level: "balanced",
          });
          await db.from("workspace_members").insert({ workspace_id: wsId, user_id: userId, role: "owner" });
          await db.from("workspace_billing").insert({ workspace_id: wsId, plan: "pending", status: "pending" });

          finalWorkspaceId = wsId;
          finalEmail = email;
        } catch (insertErr) {
          log("error", "billing.workspace_creation_failed", { error: insertErr instanceof Error ? insertErr.message : String(insertErr) });
          // Fallback: try to get existing workspace one more time
          const { data: fallbackUser } = await db.from("users").select("id").eq("email", email).maybeSingle();
          const fallbackUid = (fallbackUser as { id: string } | null)?.id;
          if (fallbackUid) {
            const { data: fallbackWs } = await db.from("workspaces").select("id").eq("owner_id", fallbackUid).order("created_at", { ascending: false }).limit(1).maybeSingle();
            if (fallbackWs) {
              finalWorkspaceId = (fallbackWs as { id: string }).id;
            }
          }
        }
      }
    }
    
    if (!finalWorkspaceId) {
      log("error", "billing.checkout_failed", { reason: "workspace_not_found" });
      return NextResponse.json({ ok: false, reason: "workspace_not_found" }, { status: 404 });
    }

    const rl = await checkRateLimit(`checkout:${finalWorkspaceId}`, 5, 60_000);
    if (!rl.allowed) {
      const retryAfterSeconds = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.max(0, retryAfterSeconds)) } }
      );
    }

    // Idempotency: check if workspace already has active/trial subscription
    const { data: ws } = await db
      .from("workspaces")
      .select("id, stripe_customer_id, owner_id, billing_status, stripe_subscription_id")
      .eq("id", finalWorkspaceId)
      .maybeSingle();

    if (!ws) {
      log("error", "billing.checkout_failed", { workspace_id: finalWorkspaceId, reason: "workspace_not_found" });
      return NextResponse.json({ ok: false, reason: "workspace_not_found" }, { status: 404 });
    }

    const wsData = ws as { billing_status?: string; stripe_subscription_id?: string | null };
    const hasActiveSubscription = wsData.stripe_subscription_id !== null && wsData.stripe_subscription_id !== undefined;
    if (hasActiveSubscription) {
      log("info", "billing.checkout_started", { workspace_id: finalWorkspaceId, reason: "already_active" });
      return NextResponse.json({ ok: true, reason: "already_active", workspace_id: finalWorkspaceId }, { status: 200 });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);

    // Get email if not provided
    if (!finalEmail) {
      const ownerId = (ws as { owner_id?: string })?.owner_id;
      if (ownerId) {
        const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
        finalEmail = (user as { email?: string })?.email || "";
      }
    }

    const successUrl = body.success_url ?? `${origin}/connect?workspace_id=${encodeURIComponent(finalWorkspaceId)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = body.cancel_url ?? `${origin}/activate?canceled=1`;

    // Idempotent customer creation to avoid race conditions:
    // 1. Reuse existing stripe_customer_id when present.
    // 2. If absent, create a customer, then attempt to claim the workspace row
    //    only if stripe_customer_id is still null. If another request won the race,
    //    fall back to the stored customer id and leave the extra Stripe customer orphaned.
    let customerId = (ws as { stripe_customer_id?: string | null }).stripe_customer_id ?? null;
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: finalEmail || undefined,
          metadata: { workspace_id: finalWorkspaceId },
          invoice_settings: { footer: RECEIPT_FOOTER },
        });
        const createdId = customer.id;

        // Persist Stripe customer ID — critical for billing reconciliation.
        try {
          await db
            .from("workspaces")
            .update({ stripe_customer_id: createdId, updated_at: new Date().toISOString() })
            .eq("id", finalWorkspaceId);
        } catch (persistErr) {
          log("error", "billing.persist_stripe_customer_id_failed", { workspace_id: finalWorkspaceId, stripe_customer_id: createdId, error: persistErr instanceof Error ? persistErr.message : String(persistErr) });
        }
        customerId = createdId;
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown_error";
        log("error", "billing.customer_create_failed", { workspace_id: finalWorkspaceId, reason: "customer_create_failed", error: message });
          return NextResponse.json({ ok: false, reason: "customer_create_failed" }, { status: 500 });
      }
    } else {
      await stripe.customers
        .update(customerId, {
          invoice_settings: { footer: RECEIPT_FOOTER },
        })
        .catch((err) => { log("error", "billing.customer_update_failed", { error: err instanceof Error ? err.message : String(err) }); });
    }

    try {
      // No free trial — card charged immediately. Users experience the product
      // through the live demo call before signup. This maximizes commitment and
      // eliminates tire-kickers who never convert.
      const trialPeriodDays: number | undefined = undefined;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        metadata: { workspace_id: finalWorkspaceId },
        payment_method_collection: "always",
        payment_method_types: ["card"],
        line_items: [{ price: stripePriceId, quantity: 1 }],
        subscription_data: {
          ...(trialPeriodDays !== undefined && { trial_period_days: trialPeriodDays }),
          metadata: { workspace_id: finalWorkspaceId },
        },
        /* customer_email is omitted because we always pass `customer` above */
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
      });

      log("info", "billing.checkout_started", { workspace_id: finalWorkspaceId, session_id: session.id });

      return NextResponse.json({
        ok: true,
        url: session.url,
        checkout_url: session.url,
        session_id: session.id,
      });
    } catch (stripeError) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : "Stripe checkout failed";
      log("error", "billing.subscription_create_failed", { workspace_id: finalWorkspaceId, reason: "subscription_create_failed", error: errorMessage });
      return NextResponse.json({ ok: false, reason: "subscription_create_failed" }, { status: 500 });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log("error", "billing.unexpected_error", { reason: "unexpected_error", error: errorMessage });
    return NextResponse.json({ ok: false, reason: "unexpected_error" }, { status: 500 });
  }
}
