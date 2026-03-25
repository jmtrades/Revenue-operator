/**
 * Payments provider read API for reconciliation. Gated by env (STRIPE_SECRET_KEY).
 */

export interface ChargeRow {
  payment_id: string;
  amount_cents: number;
  captured_at: string;
  deal_id?: string | null;
}

export interface RefundRow {
  refund_id: string;
  amount_cents: number;
  refunded_at: string;
  payment_id?: string | null;
}

export interface PaymentsReadProvider {
  listRecentCharges(params: { workspaceId: string; since: string; limit: number }): Promise<ChargeRow[]>;
  listRecentRefunds(params: { workspaceId: string; since: string; limit: number }): Promise<RefundRow[]>;
}

const FETCH_TIMEOUT_MS = 15_000;

function isPaymentsConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY);
}

/**
 * Stripe: list recent charges/refunds. Returns empty if not configured.
 */
export function createStripePaymentsProvider(): PaymentsReadProvider {
  return {
    async listRecentCharges({ workspaceId: _workspaceId, since, limit }) {
      if (!isPaymentsConfigured()) return [];
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "");
        const created = { gte: Math.floor(new Date(since).getTime() / 1000) };
        const charges = await Promise.race([
          stripe.charges.list({ created, limit: Math.min(limit, 100) }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), FETCH_TIMEOUT_MS)),
        ]);
        const out: ChargeRow[] = [];
        for (const c of charges.data ?? []) {
          out.push({
            payment_id: c.id,
            amount_cents: c.amount ?? 0,
            captured_at: c.created ? new Date(c.created * 1000).toISOString() : "",
            deal_id: (c.metadata as { deal_id?: string })?.deal_id ?? null,
          });
        }
        return out;
      } catch {
        return [];
      }
    },

    async listRecentRefunds({ since, limit }) {
      if (!isPaymentsConfigured()) return [];
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "");
        const created = { gte: Math.floor(new Date(since).getTime() / 1000) };
        const refs = await Promise.race([
          stripe.refunds.list({ created, limit: Math.min(limit, 100) }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), FETCH_TIMEOUT_MS)),
        ]);
        const out: RefundRow[] = [];
        for (const r of refs.data ?? []) {
          out.push({
            refund_id: r.id,
            amount_cents: r.amount ?? 0,
            refunded_at: r.created ? new Date(r.created * 1000).toISOString() : "",
            payment_id: typeof r.charge === "string" ? r.charge : r.charge?.id ?? null,
          });
        }
        return out;
      } catch {
        return [];
      }
    },
  };
}

export function getPaymentsProvider(): PaymentsReadProvider | null {
  return isPaymentsConfigured() ? createStripePaymentsProvider() : null;
}
