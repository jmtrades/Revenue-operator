/**
 * Phase 78 / Task 6.4 — RETIRED.
 *
 * This route duplicated `/api/billing/overage`: both paths call
 * `stripe.invoiceItems.create` for the same monthly minute overage,
 * but with different idempotency keys — so Stripe treats the two
 * writes as distinct operations and double-bills the customer.
 *
 * Single source of truth for overage billing is now
 * `src/app/api/billing/overage/route.ts`, whose idempotency key is
 * scoped to `(workspace, billing_period_end)` and therefore stable
 * across retries within a period.
 *
 * Preserving this handler as a 410 Gone so any cached schedule that
 * still fires it gets a visible signal rather than silently re-running
 * old logic. Remove the file entirely once every caller is off it.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "route_retired",
      retired_at: "2026-04-22",
      replacement: "/api/billing/overage",
      reason:
        "Duplicate overage biller. Use /api/billing/overage (period-scoped idempotency) instead.",
    },
    { status: 410 },
  );
}
