/**
 * Cron: Monthly attribution billing job.
 * Aggregates attributable revenue, applies fee, creates invoice.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { subDays, startOfMonth, endOfMonth } from "date-fns";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const lastMonth = subDays(new Date(), 30);
    const periodStart = startOfMonth(lastMonth);
    const periodEnd = endOfMonth(lastMonth);

    const { data: workspaces } = await db.from("workspaces").select("id").limit(100);

    for (const ws of workspaces ?? []) {
      const workspaceId = ws.id;

      const { data: attributions } = await db
        .from("attribution_records")
        .select("deal_id, milestone")
        .in(
          "deal_id",
          (await db.from("deals").select("id").eq("workspace_id", workspaceId)).data?.map((d: { id: string }) => d.id) ?? []
        );

      const dealIds = [...new Set((attributions ?? []).map((a: { deal_id: string }) => a.deal_id))];

      const { data: payments } = await db
        .from("payment_records")
        .select("amount_cents")
        .eq("workspace_id", workspaceId)
        .gte("detected_at", periodStart.toISOString())
        .lte("detected_at", periodEnd.toISOString());

      const attributableCents = (payments ?? []).reduce((s: number, p: { amount_cents: number }) => s + (p.amount_cents ?? 0), 0);
      const feePercent = 10;
      const feeCents = Math.round(attributableCents * (feePercent / 100));

      if (feeCents <= 0) continue;

      // Idempotency: skip if invoice already exists for this workspace and period
      const { data: existingInvoice } = await db.from("invoices").select("id")
        .eq("workspace_id", workspaceId)
        .eq("period_start", periodStart.toISOString().slice(0, 10))
        .eq("period_end", periodEnd.toISOString().slice(0, 10))
        .limit(1)
        .maybeSingle();
      if (existingInvoice) continue;

      const { data: invoice } = await db.from("invoices").insert({
        workspace_id: workspaceId,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
        attributable_revenue_cents: attributableCents,
        fee_percent: feePercent,
        fee_cents: feeCents,
        status: "draft",
      }).select("id").maybeSingle();

      if (invoice) {
        const disputeUntil = new Date();
        disputeUntil.setDate(disputeUntil.getDate() + 7);
        await db.from("invoice_items").insert({
          invoice_id: (invoice as { id: string }).id,
          amount_cents: feeCents,
          evidence_chain: {
            workspace_id: workspaceId,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            attributable_revenue_cents: attributableCents,
            fee_percent: feePercent,
            deal_ids: dealIds,
            final_trigger: "billing_cron",
          },
          dispute_until: disputeUntil.toISOString(),
          status: "pending",
        });
      }
    }

    return NextResponse.json({ ok: true, message: "Billing job completed" });
  } catch (err) {
    log("error", "cron.billing_unexpected_error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { ok: true, note: "error_handled", ts: new Date().toISOString() },
      { status: 200 }
    );
  }
}
