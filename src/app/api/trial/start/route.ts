/**
 * Trial start: create user + workspace from email, then create Stripe checkout.
 * Returns { ok: true, checkout_url } on success. Idempotent: already_active returns ok without checkout_url.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { createSessionCookie } from "@/lib/auth/session";
import { getPriceId } from "@/lib/stripe-prices";
import { randomUUID } from "crypto";
import { assertSameOrigin } from "@/lib/http/csrf";
import { getStripe } from "@/lib/billing/stripe-client";
import { stripeIdempotencyKey } from "@/lib/billing/stripe-idempotency";

function log(_event: string, _data: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "development") {
    // Optional logging
  }
}

function effectiveOrigin(req: NextRequest): string | null {
  const fromReq = new URL(req.url).origin;
  const isLocal = fromReq.includes("localhost") || fromReq.includes("127.0.0.1");
  const isPreview = fromReq.includes("preview") || fromReq.includes("onrender.com");
  if (isLocal || isPreview) return process.env.NEXT_PUBLIC_APP_URL ?? null;
  return fromReq || (process.env.NEXT_PUBLIC_APP_URL ?? null);
}

function jsonWithSession(
  body: { ok: boolean; workspace_id?: string; checkout_url?: string; reason?: string },
  userId: string,
  workspaceId: string
) {
  const res = NextResponse.json(body);
  const cookie = createSessionCookie({ userId, workspaceId });
  if (cookie) res.headers.set("Set-Cookie", cookie);
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const csrfErr = assertSameOrigin(req);
    if (csrfErr) return csrfErr;

    let body: { email: string; hired_roles?: string[]; business_type?: string; tier?: string; interval?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
    }

    const email = body.email?.trim();
    const tier = (body.tier ?? "solo").toString().trim() || "solo";
    const interval = (body.interval ?? "month").toString().trim() || "month";
    const hiredRoles = Array.isArray(body.hired_roles) && body.hired_roles.length
      ? body.hired_roles
      : ["full_autopilot"];
    const businessType = typeof body.business_type === "string" && body.business_type.trim()
      ? body.business_type.trim()
      : null;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
    }

    const db = getDb();
    
    // Check if workspace already exists with active/trial subscription (idempotency)
    const { data: existingUser } = await db.from("users").select("id").eq("email", email).limit(1).maybeSingle();
    if (existingUser) {
      const uid = (existingUser as { id: string }).id;
      const { data: existingWs } = await db
        .from("workspaces")
        .select("id, billing_status, stripe_subscription_id")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (existingWs) {
        const ws = existingWs as { id: string; billing_status?: string; stripe_subscription_id?: string | null };
        const hasActiveSubscription = ws.billing_status === "trial" || ws.billing_status === "active" || ws.stripe_subscription_id;
        if (hasActiveSubscription) {
          log("trial_start_succeeded", { workspace_id: ws.id, reason: "already_active" });
          return jsonWithSession({ ok: true, reason: "already_active", workspace_id: ws.id }, uid, ws.id);
        }
      }
    }

    const userId = randomUUID();

    const { error: userErr } = await db.from("users").insert({
      id: userId,
      email,
      full_name: null,
    });

    if (userErr) {
      const { data: existing } = await db.from("users").select("id").eq("email", email).limit(1).maybeSingle();
      const uid = (existing as { id: string } | null)?.id;
      if (uid) {
        const { data: ws } = await db.from("workspaces").select("id, billing_status, stripe_subscription_id").eq("owner_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (ws) {
          const wid = (ws as { id: string }).id;
          const wsData = ws as { billing_status?: string; stripe_subscription_id?: string | null };
          const hasActiveSubscription = wsData.billing_status === "trial" || wsData.billing_status === "active" || wsData.stripe_subscription_id;
          if (hasActiveSubscription) {
            log("trial_start_succeeded", { workspace_id: wid, reason: "already_active" });
            return jsonWithSession({ ok: true, reason: "already_active", workspace_id: wid }, uid, wid);
          }
        }
        const wsId = randomUUID();
        const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const { error: wsInsertErr } = await db.from("workspaces").insert({
          id: wsId,
          name: "My workspace",
          owner_id: uid,
          autonomy_level: "assisted",
          kill_switch: false,
          billing_status: "trial",
          protection_renewal_at: trialEnd.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
          trial_end_at: trialEnd.toISOString(),
        });
        if (wsInsertErr) {
          log("trial_start_failed", { workspace_id: wsId, reason: "workspace_creation_failed", db_error: wsInsertErr.message ?? String(wsInsertErr) });
          return NextResponse.json({ ok: false, reason: "workspace_creation_failed" }, { status: 502 });
        }
        const settingsResult = await db.from("settings").insert({
          workspace_id: wsId,
          risk_level: "balanced",
          hired_roles: hiredRoles,
          business_type: businessType,
          autonomy_mode: "act",
          responsibility_level: "guarantee",
        });
        if (settingsResult.error) {
          // Non-critical, continue
        }
        await db.from("workspace_members").insert({ workspace_id: wsId, user_id: uid, role: "owner" });
        await db.from("workspace_billing").insert({ workspace_id: wsId, plan: "trial", status: "trialing" });
        try {
          const { applyPresetToWorkspace } = await import("@/lib/presets/apply");
          await applyPresetToWorkspace(wsId, businessType);
        } catch {
          // Non-critical, continue
        }
        // Create checkout and return checkout_url (see below after workspace creation)
        const wsIdForCheckout = wsId;
        const uidForCheckout = uid;
        const origin = effectiveOrigin(req);
        if (!origin) {
          log("trial_start_failed", { reason: "missing_env", missing: ["NEXT_PUBLIC_APP_URL"] });
          return NextResponse.json({ ok: false, reason: "missing_env", missing: ["NEXT_PUBLIC_APP_URL"] }, { status: 503 });
        }
        const stripeKeyInner = process.env.STRIPE_SECRET_KEY;
        if (!stripeKeyInner) {
          log("trial_start_failed", { reason: "missing_env", missing: ["STRIPE_SECRET_KEY"] });
          return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
        }
        const priceResult = await getPriceId(tier, interval);
        if (!priceResult.ok) {
          log("trial_start_failed", { reason: priceResult.reason, tier, interval });
          return NextResponse.json({ ok: false, reason: priceResult.reason }, { status: 502 });
        }
        const stripePriceId = priceResult.price_id;
        try {
          // Phase 78/Phase 6: shared factory with pinned apiVersion
          const stripe = getStripe();
          let customerId: string | null = null;
          const { data: wsRow } = await db.from("workspaces").select("stripe_customer_id").eq("id", wsIdForCheckout).maybeSingle();
          customerId = (wsRow as { stripe_customer_id?: string | null })?.stripe_customer_id ?? null;
          if (!customerId) {
            const customer = await stripe.customers.create({
              email,
              metadata: { workspace_id: wsIdForCheckout },
            }, {
              // Phase 78/Phase 6.2: never create two Stripe customers for one workspace
              idempotencyKey: stripeIdempotencyKey("customer-create", wsIdForCheckout),
            });
            customerId = customer.id;
            await db.from("workspaces").update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() }).eq("id", wsIdForCheckout);
          }
          const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            metadata: { workspace_id: wsIdForCheckout },
            payment_method_collection: "always",
            payment_method_types: ["card"],
            line_items: [{ price: stripePriceId, quantity: 1 }],
            subscription_data: { trial_period_days: 14, metadata: { workspace_id: wsIdForCheckout } },
            success_url: `${origin}/connect?workspace_id=${encodeURIComponent(wsIdForCheckout)}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/activate?canceled=1`,
          }, {
            // Phase 78/Phase 6.2: idempotent by (workspace, tier, interval) so a
            // retried trial-start in the same day reuses the same checkout session.
            idempotencyKey: stripeIdempotencyKey("trial-checkout", wsIdForCheckout, tier, interval),
          });
          const checkoutUrl = session.url ?? null;
          if (!checkoutUrl) {
            log("trial_start_failed", { reason: "checkout_creation_failed" });
            return NextResponse.json({ ok: false, reason: "checkout_creation_failed" }, { status: 502 });
          }
          log("trial_start_succeeded", { workspace_id: wsIdForCheckout });
          return jsonWithSession({ ok: true, workspace_id: wsIdForCheckout, checkout_url: checkoutUrl }, uidForCheckout, wsIdForCheckout);
        } catch (stripeErr) {
          const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
          log("trial_start_failed", { reason: "stripe_unreachable", error: msg });
          return NextResponse.json({ ok: false, reason: "stripe_unreachable" }, { status: 502 });
        }
      }
      log("trial_start_failed", { reason: "user_create_failed" });
      return NextResponse.json({ ok: false, reason: "workspace_creation_failed" }, { status: 502 });
    }

    const workspaceId = randomUUID();
    const { error: wsErr } = await db.from("workspaces").insert({
      id: workspaceId,
      name: "My workspace",
      owner_id: userId,
      autonomy_level: "assisted",
      kill_switch: false,
      billing_status: "pending",
      protection_renewal_at: null,
      trial_ends_at: null,
      trial_end_at: null,
    });

    if (wsErr) {
      const errMsg = wsErr.message ?? String(wsErr);
      log("trial_start_failed", { workspace_id: workspaceId, reason: "workspace_creation_failed", db_error: errMsg });
      return NextResponse.json({ ok: false, reason: "workspace_creation_failed" }, { status: 502 });
    }

    const origin = effectiveOrigin(req);
    if (!origin) {
      log("trial_start_failed", { reason: "missing_env", missing: ["NEXT_PUBLIC_APP_URL"] });
      return NextResponse.json({ ok: false, reason: "missing_env", missing: ["NEXT_PUBLIC_APP_URL"] }, { status: 503 });
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      log("trial_start_failed", { reason: "missing_env", missing: ["STRIPE_SECRET_KEY"] });
      return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
    }
    const priceResult = await getPriceId(tier, interval);
    if (!priceResult.ok) {
      log("trial_start_failed", { reason: priceResult.reason, tier, interval });
      return NextResponse.json({ ok: false, reason: priceResult.reason }, { status: 502 });
    }
    const stripePriceId = priceResult.price_id;

    await db.from("settings").insert({
      workspace_id: workspaceId,
      risk_level: "balanced",
      hired_roles: hiredRoles,
      business_type: businessType,
      autonomy_mode: "act",
      responsibility_level: "guarantee",
    });
    // Non-critical if settings insert fails

    await db.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner" });
    await db.from("workspace_billing").insert({ workspace_id: workspaceId, plan: "trial", status: "trialing" });

    try {
      const { applyPresetToWorkspace } = await import("@/lib/presets/apply");
      await applyPresetToWorkspace(workspaceId, businessType);
    } catch {
      // Non-critical if preset application fails
    }

    const _activationResult = await db.from("activation_states").upsert(
      { workspace_id: workspaceId, step: "scan", updated_at: new Date().toISOString() },
      { onConflict: "workspace_id" }
    );
    // Non-critical if activation state upsert fails

    try {
      await db.from("activation_events").insert({
        workspace_id: workspaceId,
        user_id: userId,
        step: "signup",
        metadata: {},
      });
    } catch {
      // Non-blocking
    }

    try {
      // Phase 78/Phase 6: shared factory with pinned apiVersion
      const stripe = getStripe();
      let customerId: string | null = null;
      const { data: wsRow } = await db.from("workspaces").select("stripe_customer_id").eq("id", workspaceId).maybeSingle();
      customerId = (wsRow as { stripe_customer_id?: string | null })?.stripe_customer_id ?? null;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email,
          metadata: { workspace_id: workspaceId },
        }, {
          // Phase 78/Phase 6.2: never create two Stripe customers for one workspace
          idempotencyKey: stripeIdempotencyKey("customer-create", workspaceId),
        });
        customerId = customer.id;
        await db.from("workspaces").update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() }).eq("id", workspaceId);
      }
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        metadata: { workspace_id: workspaceId },
        payment_method_collection: "always",
        payment_method_types: ["card"],
        line_items: [{ price: stripePriceId, quantity: 1 }],
        subscription_data: { metadata: { workspace_id: workspaceId } },
        success_url: `${origin}/connect?workspace_id=${encodeURIComponent(workspaceId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/activate?canceled=1`,
      }, {
        // Phase 78/Phase 6.2: idempotent checkout session per (workspace, tier, interval, day)
        idempotencyKey: stripeIdempotencyKey("subscription-checkout", workspaceId, tier, interval),
      });
      const checkoutUrl = session.url ?? null;
      if (!checkoutUrl) {
        log("trial_start_failed", { reason: "checkout_creation_failed" });
        return NextResponse.json({ ok: false, reason: "checkout_creation_failed" }, { status: 502 });
      }
      log("trial_start_succeeded", { workspace_id: workspaceId });
      return jsonWithSession({ ok: true, workspace_id: workspaceId, checkout_url: checkoutUrl }, userId, workspaceId);
    } catch (stripeErr) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      log("trial_start_failed", { reason: "stripe_unreachable", error: msg });
      return NextResponse.json({ ok: false, reason: "stripe_unreachable" }, { status: 502 });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log("trial_start_failed", { reason: "unexpected_error", error: errorMessage });
    return NextResponse.json({ ok: false, reason: "checkout_creation_failed" }, { status: 502 });
  }
}
