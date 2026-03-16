/**
 * Stripe checkout: create session for activation
 * 14-day trial, payment method upfront, USD only
 * Economic framing: use BILLING_EMAIL_SUBJECT and INVOICE_DESCRIPTION in Stripe Product/email settings.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { RECEIPT_FOOTER } from "@/lib/billing-copy";
import { getPriceId } from "@/lib/stripe-prices";

function log(_event: string, _data: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "development") {
    // Optional logging
  }
}

/** Build production-safe origin: never localhost, never preview. Prefer request origin. */
function effectiveOrigin(req: NextRequest): string | null {
  const fromReq = new URL(req.url).origin;
  const isLocal = fromReq.includes("localhost") || fromReq.includes("127.0.0.1");
  const isPreview = fromReq.includes("preview") || fromReq.includes("vercel.app");
  if (isLocal || isPreview) return process.env.NEXT_PUBLIC_APP_URL ?? null;
  return fromReq || (process.env.NEXT_PUBLIC_APP_URL ?? null);
}

export async function POST(req: NextRequest) {
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

    const tier = (body.tier ?? "solo").toString().trim() || "solo";
    const interval = (body.interval ?? "month").toString().trim() || "month";

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      log("checkout_failed", { reason: "missing_stripe_key" });
      return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
    }
    const origin = effectiveOrigin(req);
    if (!origin) {
      log("checkout_failed", { reason: "missing_app_url" });
      return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
    }

    const priceResult = await getPriceId(tier, interval);
    if (!priceResult.ok) {
      log("checkout_failed", { reason: priceResult.reason, tier, interval });
      return NextResponse.json({ ok: false, reason: priceResult.reason }, { status: 200 });
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
    }

    const db = getDb();
    
    // If workspace_id provided, use it; otherwise create workspace from email
    let finalWorkspaceId = workspaceId;
    let finalEmail = email;
    
    if (!finalWorkspaceId && email) {
      const { randomUUID } = await import("crypto");
      const userId = randomUUID();
      const wsId = randomUUID();
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      
      try {
        await db.from("users").insert({
          id: userId,
          email,
          full_name: null,
        });
        
        await db.from("workspaces").insert({
          id: wsId,
          name: "My workspace",
          owner_id: userId,
          autonomy_level: "assisted",
          kill_switch: false,
          billing_status: "trial",
          protection_renewal_at: trialEnd.toISOString(),
        });
        
        await db.from("settings").insert({
          workspace_id: wsId,
          risk_level: "balanced",
          hired_roles: ["full_autopilot"],
          autonomy_mode: "act",
          responsibility_level: "guarantee",
        });
        
        finalWorkspaceId = wsId;
        finalEmail = email;
      } catch (_err) {
        const { data: existing } = await db.from("users").select("id").eq("email", email).limit(1).maybeSingle();
        const uid = (existing as { id: string } | null)?.id;
        if (uid) {
          const { data: ws } = await db.from("workspaces").select("id").eq("owner_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (ws) {
            finalWorkspaceId = (ws as { id: string }).id;
          }
        }
      }
    }
    
    if (!finalWorkspaceId) {
      log("checkout_failed", { reason: "workspace_not_found" });
      return NextResponse.json({ ok: false, reason: "workspace_not_found" }, { status: 404 });
    }

    // Idempotency: check if workspace already has active/trial subscription
    const { data: ws } = await db
      .from("workspaces")
      .select("id, stripe_customer_id, owner_id, billing_status, stripe_subscription_id")
      .eq("id", finalWorkspaceId)
      .maybeSingle();
    
    if (!ws) {
      log("checkout_failed", { workspace_id: finalWorkspaceId, reason: "workspace_not_found" });
      return NextResponse.json({ ok: false, reason: "workspace_not_found" }, { status: 404 });
    }

    const wsData = ws as { billing_status?: string; stripe_subscription_id?: string | null };
    const hasActiveSubscription = wsData.billing_status === "trial" || wsData.billing_status === "active" || wsData.stripe_subscription_id;
    if (hasActiveSubscription) {
      log("checkout_started", { workspace_id: finalWorkspaceId, reason: "already_active" });
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

        const { data: claimed, error: claimError } = await db
          .from("workspaces")
          .update({
            stripe_customer_id: createdId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", finalWorkspaceId)
          .is("stripe_customer_id", null)
          .select("stripe_customer_id")
          .maybeSingle();

        if (claimError) {
          log("checkout_failed", {
            workspace_id: finalWorkspaceId,
            reason: "customer_claim_failed",
            db_error: claimError.message,
          });
          return NextResponse.json({ ok: false, reason: "customer_create_failed" }, { status: 502 });
        }

        if (claimed?.stripe_customer_id) {
          customerId = claimed.stripe_customer_id as string;
        } else {
          // Another request likely set stripe_customer_id first; reuse that value.
          const { data: refreshed } = await db
            .from("workspaces")
            .select("stripe_customer_id")
            .eq("id", finalWorkspaceId)
            .maybeSingle();
          customerId = (refreshed as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? createdId;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown_error";
        log("checkout_failed", { workspace_id: finalWorkspaceId, reason: "customer_create_failed", error: message });
        return NextResponse.json({ ok: false, reason: "customer_create_failed" }, { status: 502 });
      }
    } else {
      await stripe.customers
        .update(customerId, {
          invoice_settings: { footer: RECEIPT_FOOTER },
        })
        .catch(() => {});
    }

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        metadata: { workspace_id: finalWorkspaceId },
        payment_method_collection: "always",
        payment_method_types: ["card"],
        line_items: [{ price: stripePriceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 14,
          metadata: { workspace_id: finalWorkspaceId },
        },
        customer_email: finalEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
      });

      log("checkout_started", { workspace_id: finalWorkspaceId, session_id: session.id });

      return NextResponse.json({
        ok: true,
        url: session.url,
        checkout_url: session.url,
        session_id: session.id,
      });
    } catch (stripeError) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : "Stripe checkout failed";
      log("checkout_failed", { workspace_id: finalWorkspaceId, reason: "subscription_create_failed", error: errorMessage });
      return NextResponse.json({ ok: false, reason: "subscription_create_failed" }, { status: 502 });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log("checkout_failed", { reason: "unexpected_error", error: errorMessage });
    return NextResponse.json({ ok: false, reason: "unexpected_error" }, { status: 502 });
  }
}
