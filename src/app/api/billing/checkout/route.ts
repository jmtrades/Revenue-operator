/**
 * Stripe checkout: create session for activation
 * 14-day trial, payment method upfront, USD only
 * Economic framing: use BILLING_EMAIL_SUBJECT and INVOICE_DESCRIPTION in Stripe Product/email settings.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { RECEIPT_FOOTER } from "@/lib/billing-copy";

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; email?: string; success_url?: string; cancel_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required env vars (read at request time for tests and flexibility)
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const missing: string[] = [];
  if (!stripeSecretKey) missing.push("STRIPE_SECRET_KEY");
  if (!stripePriceId || stripePriceId === "price_placeholder") missing.push("STRIPE_PRICE_ID");
  if (!appUrl) missing.push("NEXT_PUBLIC_APP_URL");

  if (missing.length > 0) {
    console.error("[checkout] Missing env vars:", missing);
    return NextResponse.json(
      { 
        error: "STRIPE_NOT_CONFIGURED",
        missing,
        message: "Payment setup isn't complete yet."
      },
      { status: 500 }
    );
  }

  const workspaceId = body.workspace_id?.trim();
  const email = body.email?.trim();
  
  if (!workspaceId && !email) {
    return NextResponse.json({ error: "workspace_id or email required" }, { status: 400 });
  }

  const db = getDb();
  
  // If workspace_id provided, use it; otherwise create workspace from email
  let finalWorkspaceId = workspaceId;
  let finalEmail = email;
  
  if (!finalWorkspaceId && email) {
    // Create workspace from email (same logic as trial/start)
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
    } catch (err) {
      // User might already exist
      const { data: existing } = await db.from("users").select("id").eq("email", email).limit(1).single();
      const uid = (existing as { id: string } | null)?.id;
      if (uid) {
        const { data: ws } = await db.from("workspaces").select("id").eq("owner_id", uid).order("created_at", { ascending: false }).limit(1).single();
        if (ws) {
          finalWorkspaceId = (ws as { id: string }).id;
        }
      }
    }
  }
  
  if (!finalWorkspaceId) {
    return NextResponse.json({ error: "Failed to create or find workspace" }, { status: 500 });
  }

  const { data: ws } = await db.from("workspaces").select("id, stripe_customer_id, owner_id").eq("id", finalWorkspaceId).single();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeSecretKey!); // Already validated above

  // Get email if not provided
  if (!finalEmail) {
    const ownerId = (ws as { owner_id?: string })?.owner_id;
    if (ownerId) {
      const { data: user } = await db.from("users").select("email").eq("id", ownerId).single();
      finalEmail = (user as { email?: string })?.email;
    }
  }

  const baseUrl = appUrl;
  const successUrl = body.success_url ?? `${baseUrl}/connect?workspace_id=${encodeURIComponent(finalWorkspaceId)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = body.cancel_url ?? `${baseUrl}/activate?canceled=1`;

  let customerId = (ws as { stripe_customer_id?: string | null }).stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: finalEmail,
      metadata: { workspace_id: finalWorkspaceId },
      invoice_settings: { footer: RECEIPT_FOOTER },
    });
    customerId = customer.id;
    await db.from("workspaces").update({
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    }).eq("id", finalWorkspaceId);
  } else {
    await stripe.customers.update(customerId, {
      invoice_settings: { footer: RECEIPT_FOOTER },
    }).catch(() => {});
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

    console.log("[checkout] Created session:", session.id, "for workspace:", finalWorkspaceId);

    return NextResponse.json({
      url: session.url,
      checkout_url: session.url, // Backward compat
      session_id: session.id,
    });
  } catch (stripeError) {
    console.error("[checkout] Stripe error:", stripeError);
    const errorMessage = stripeError instanceof Error ? stripeError.message : "Stripe checkout failed";
    return NextResponse.json(
      { error: "CHECKOUT_FAILED", message: errorMessage },
      { status: 500 }
    );
  }
}
