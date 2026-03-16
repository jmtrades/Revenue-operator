/**
 * Create Stripe Customer Portal session. Returns URL for "Manage billing".
 * Billing must never cause execution failure — errors return 200 with reason.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

function log(_event: string, _data: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "development") {
    // Portal event logged for debugging when needed
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: { workspace_id: string; return_url?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
    }

    const workspaceId = body.workspace_id?.trim();
    if (!workspaceId) {
      return NextResponse.json({ ok: false, reason: "workspace_id_required" }, { status: 400 });
    }
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      log("portal_failed", { reason: "missing_stripe_key" });
      return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const returnUrl = body.return_url?.trim() || `${origin}/dashboard/billing`;

    const db = getDb();
    const { data: row } = await db
      .from("workspaces")
      .select("stripe_customer_id")
      .eq("id", workspaceId)
      .maybeSingle();

    const customerId = (row as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
    if (!customerId) {
      log("portal_failed", { workspace_id: workspaceId, reason: "no_customer" });
      return NextResponse.json({ ok: false, reason: "no_customer" }, { status: 404 });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("portal_failed", { reason: "unexpected_error", error: msg });
    return NextResponse.json({ ok: false, reason: "unexpected_error" }, { status: 502 });
  }
}
