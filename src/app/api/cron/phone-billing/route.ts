/**
 * Cron: Monthly phone number billing.
 * For each workspace with active phone numbers, creates Stripe invoice items
 * for the monthly phone number fees.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import Stripe from "stripe";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia" as unknown as Stripe.StripeConfig["apiVersion"],
  });

  const db = getDb();
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all active phone numbers that haven't been billed in the last 30 days
  const { data: numbers } = await db
    .from("phone_numbers")
    .select("id, workspace_id, phone_number, monthly_cost_cents, number_type, last_billed_at")
    .eq("status", "active");

  if (!numbers || numbers.length === 0) {
    return NextResponse.json({ ok: true, message: "No active numbers to bill", billed: 0 });
  }

  // Group by workspace for efficient billing
  const byWorkspace = new Map<string, Array<typeof numbers[0]>>();
  for (const num of numbers) {
    const n = num as { workspace_id: string; last_billed_at: string | null };
    // Skip if billed within last 30 days
    if (n.last_billed_at && new Date(n.last_billed_at) > oneMonthAgo) continue;
    const list = byWorkspace.get(n.workspace_id) || [];
    list.push(num);
    byWorkspace.set(n.workspace_id, list);
  }

  let totalBilled = 0;
  const errors: string[] = [];

  for (const [workspaceId, phoneNumbers] of byWorkspace.entries()) {
    try {
      // Get workspace Stripe customer ID
      const { data: ws } = await db
        .from("workspaces")
        .select("stripe_customer_id, billing_status")
        .eq("id", workspaceId)
        .maybeSingle();

      const workspace = ws as { stripe_customer_id?: string; billing_status?: string } | null;
      if (!workspace?.stripe_customer_id) {
        log("warn", "phone_billing.no_stripe_customer", { workspace_id: workspaceId });
        continue;
      }

      // Only bill active/pending/trial workspaces
      if (!workspace.billing_status || !["pending", "trial", "active"].includes(workspace.billing_status)) {
        continue;
      }

      // Calculate total
      const totalCents = phoneNumbers.reduce(
        (sum, n) => sum + ((n as { monthly_cost_cents: number }).monthly_cost_cents || 300),
        0
      );

      const numberCount = phoneNumbers.length;
      const description = numberCount === 1
        ? `Phone number: ${(phoneNumbers[0] as { phone_number: string }).phone_number} — monthly fee`
        : `${numberCount} phone numbers — monthly fee`;

      // Create invoice item on the customer's next invoice
      await stripe.invoiceItems.create({
        customer: workspace.stripe_customer_id,
        amount: totalCents,
        currency: "usd",
        description,
        metadata: {
          workspace_id: workspaceId,
          phone_count: String(numberCount),
          type: "phone_number_monthly",
        },
      });

      // Mark all numbers as billed
      const ids = phoneNumbers.map((n) => (n as { id: string }).id);
      await db
        .from("phone_numbers")
        .update({ last_billed_at: now.toISOString() })
        .in("id", ids);

      totalBilled += numberCount;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", "phone_billing.workspace_error", { workspace_id: workspaceId, error: msg });
      errors.push(`${workspaceId}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Phone billing complete: ${totalBilled} numbers billed`,
    billed: totalBilled,
    errors: errors.length > 0 ? errors : undefined,
  });
}
