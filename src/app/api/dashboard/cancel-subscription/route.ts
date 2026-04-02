/**
 * POST /api/dashboard/cancel-subscription — Record cancellation reason and
 * cancel the Stripe subscription at period end.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: { workspace_id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  try {
    /* ── Save cancellation reason ────────────────────────── */
    const reason = body.reason ?? "unspecified";
    const { error: insertErr } = await db.from("cancellation_reasons").insert({
      workspace_id: workspaceId,
      reason,
      created_at: new Date().toISOString(),
    });
    if (insertErr) {
      log("error", "[cancel-subscription] Failed to save cancellation reason:", { error: insertErr.message });
    }

    /* ── Cancel via Stripe if subscription exists ────────── */
    const { data: ws } = await db
      .from("workspaces")
      .select("stripe_subscription_id, billing_status")
      .eq("id", workspaceId)
      .maybeSingle();

    const subId = (ws as { stripe_subscription_id?: string } | null)?.stripe_subscription_id;

    if (subId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = (await import("stripe")).default;
        const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);
        await stripeClient.subscriptions.update(subId, {
          cancel_at_period_end: true,
          metadata: { cancellation_reason: reason },
        });
      } catch (err) {
        log("error", "[cancel-subscription] Stripe error:", { error: err });
        // Still proceed — record is saved, Stripe can be reconciled
      }
    }

    /* ── Update workspace status ─────────────────────────── */
    const { error: updateErr } = await db
      .from("workspaces")
      .update({ billing_status: "canceling" })
      .eq("id", workspaceId);
    if (updateErr) {
      log("error", "[cancel-subscription] Failed to update workspace status:", { error: updateErr.message });
      return NextResponse.json({ error: "Failed to update subscription status" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Subscription will cancel at end of billing period." });
  } catch (err) {
    log("error", "[cancel-subscription] Unexpected error:", { error: err instanceof Error ? err.message : err });
    return NextResponse.json({ error: "Cancellation failed" }, { status: 500 });
  }
}
