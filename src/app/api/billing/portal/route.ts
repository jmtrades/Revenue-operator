/**
 * Create Stripe Customer Portal session. Returns URL for "Manage billing".
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiNotFound, apiError } from "@/lib/api/errors";

export const POST = withWorkspace(
  async (req: NextRequest, ctx: WorkspaceContext) => {
    const { workspaceId } = ctx;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      log("error", "billing.portal_failed", { reason: "missing_stripe_key" });
      return apiError("EXTERNAL_SERVICE_ERROR", "Billing service not configured", 503);
    }

    let body: { return_url?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const candidateUrl = body.return_url?.trim() || `${origin}/dashboard/billing`;
    // Prevent open redirect — only allow return URLs on our own origin
    const returnUrl = candidateUrl.startsWith(origin) ? candidateUrl : `${origin}/dashboard/billing`;

    const db = getDb();
    const { data: row } = await db
      .from("workspaces")
      .select("stripe_customer_id")
      .eq("id", workspaceId)
      .maybeSingle();

    const customerId = (row as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
    if (!customerId) {
      log("warn", "billing.portal_failed", { workspace_id: workspaceId, reason: "no_customer" });
      return apiNotFound("Stripe customer");
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return apiOk({ url: session.url });
    } catch (err) {
      log("error", "billing.portal_failed", { reason: "stripe_error", error: err instanceof Error ? err.message : String(err) });
      return apiError("STRIPE_ERROR", "Could not create billing portal session", 502);
    }
  },
  { workspaceFrom: "body" },
);
