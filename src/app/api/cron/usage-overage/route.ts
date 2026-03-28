/**
 * Cron: Monthly usage overage billing.
 * Checks each active workspace's call minutes and bills overage via Stripe.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { reportUsageOverage } from "@/lib/billing/overage";
import { BILLING_PLANS, type PlanSlug, normalizeTier } from "@/lib/billing-plans";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: true, skipped: "stripe_not_configured" });
  }

  const db = getDb();
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, billing_status, billing_tier, stripe_subscription_id")
    .eq("billing_status", "active");

  let billed = 0;
  const errors: string[] = [];

  for (const ws of workspaces || []) {
    const w = ws as { id: string; billing_tier: string; stripe_subscription_id?: string };
    if (!w.stripe_subscription_id) continue;

    try {
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const { data: calls } = await db
        .from("call_sessions")
        .select("duration_seconds, started_at")
        .eq("workspace_id", w.id)
        .gte("started_at", periodStart.toISOString());

      const totalMinutes = Math.ceil(
        (calls || []).reduce(
          (sum, c) => sum + ((c as { duration_seconds?: number }).duration_seconds || 0),
          0
        ) / 60
      );

      const tier = normalizeTier(w.billing_tier);
      const included = BILLING_PLANS[tier].includedMinutes;

      if (totalMinutes > included) {
        await reportUsageOverage(w.id, w.stripe_subscription_id, tier, totalMinutes, included);
        billed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[usage-overage] Error for workspace ${w.id}:`, msg);
      errors.push(`${w.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Usage overage billing complete: ${billed} workspaces billed`,
    billed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
