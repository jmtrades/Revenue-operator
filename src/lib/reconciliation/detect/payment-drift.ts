/**
 * Payment drift: find Stripe charges/refunds not yet in canonical signals.
 * Gated: only run when STRIPE_SECRET_KEY (or STRIPE_API_KEY) is set.
 * Read-only.
 */

import { getDb } from "@/lib/db/queries";
import { getPaymentsProvider } from "../providers/payments";

const LOOKBACK_HOURS = 24;

export interface PaymentDriftCandidate {
  type: "PaymentCaptured" | "RefundIssued";
  workspace_id: string;
  lead_id: string;
  payload: Record<string, unknown>;
}

export async function detectPaymentDrift(workspaceId: string): Promise<PaymentDriftCandidate[]> {
  const provider = getPaymentsProvider();
  if (!provider) return [];

  const db = getDb();
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const out: PaymentDriftCandidate[] = [];

  const charges = await provider.listRecentCharges({ workspaceId, since, limit: 50 });
  for (const c of charges) {
    const key = `payment_captured:${c.payment_id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const { data: existing } = await db.from("canonical_signals").select("id").eq("idempotency_key", key).maybeSingle();
    if (existing) continue;
    const leadId = await resolveLeadForPayment(workspaceId, c.deal_id);
    if (!leadId) continue;
    out.push({
      type: "PaymentCaptured",
      workspace_id: workspaceId,
      lead_id: leadId,
      payload: {
        provider: "stripe",
        payment_id: c.payment_id,
        amount_cents: c.amount_cents,
        captured_at: c.captured_at,
        discovered_at: new Date().toISOString(),
        deal_id: c.deal_id ?? null,
        source: "reconciliation",
        schema_version: 1,
      },
    });
  }

  const refunds = await provider.listRecentRefunds({ workspaceId, since, limit: 50 });
  for (const r of refunds) {
    const key = `refund_issued:${r.refund_id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const { data: existing } = await db.from("canonical_signals").select("id").eq("idempotency_key", key).maybeSingle();
    if (existing) continue;
    const leadId = await resolveLeadForRefund(workspaceId, r.payment_id);
    if (!leadId) continue;
    out.push({
      type: "RefundIssued",
      workspace_id: workspaceId,
      lead_id: leadId,
      payload: {
        provider: "stripe",
        refund_id: r.refund_id,
        amount_cents: r.amount_cents,
        refunded_at: r.refunded_at,
        discovered_at: new Date().toISOString(),
        payment_id: r.payment_id ?? null,
        source: "reconciliation",
        schema_version: 1,
      },
    });
  }
  return out;
}

async function resolveLeadForPayment(workspaceId: string, dealId?: string | null): Promise<string | null> {
  const db = getDb();
  if (dealId) {
    const { data: deal } = await db.from("deals").select("lead_id").eq("id", dealId).eq("workspace_id", workspaceId).maybeSingle();
    if (deal) return (deal as { lead_id: string }).lead_id;
  }
  const { data: first } = await db.from("leads").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle();
  return (first as { id: string } | null)?.id ?? null;
}

async function resolveLeadForRefund(workspaceId: string, paymentId?: string | null): Promise<string | null> {
  const db = getDb();
  if (paymentId) {
    const { data: sig } = await db
      .from("canonical_signals")
      .select("lead_id")
      .eq("signal_type", "PaymentCaptured")
      .contains("payload", { payment_id: paymentId })
      .limit(1)
      .maybeSingle();
    if (sig) return (sig as { lead_id: string }).lead_id;
  }
  const { data: first } = await db.from("leads").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle();
  return (first as { id: string } | null)?.id ?? null;
}
