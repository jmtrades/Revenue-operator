/**
 * Phase 78/Phase 6 Task 6.2: Stripe idempotency key helper.
 *
 * Produces a deterministic SHA-256 key for a (purpose, ...parts) tuple
 * bucketed by UTC day. Within the same day, calling Stripe with the same
 * idempotency key returns the cached response from the prior call — so
 * automatic retries or duplicate webhook triggers will NOT double-charge,
 * double-subscribe, or double-invoice.
 *
 * Usage:
 *   await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true }, {
 *     idempotencyKey: stripeIdempotencyKey("sub-cancel", workspaceId, sub.id),
 *   });
 *
 * Scope notes:
 * - Always include workspace_id (or customer_id) so cross-tenant collisions
 *   are impossible.
 * - Include the Stripe object id when mutating a specific object (sub id,
 *   customer id, invoice id) so different objects get different keys.
 * - Day-bucketing means a retry tomorrow WILL re-execute — intended, because
 *   Stripe only honors idempotency keys for 24 hours anyway.
 */

import crypto from "node:crypto";

/** Max Stripe idempotency key length; we stay well under it. */
const MAX_LEN = 255;

export function stripeIdempotencyKey(purpose: string, ...parts: string[]): string {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const material = [purpose, day, ...parts].join("|");
  const digest = crypto.createHash("sha256").update(material).digest("hex").slice(0, 40);
  const key = `ro_${digest}`;
  if (key.length > MAX_LEN) {
    // Defensive: should never fire because hex(40) + "ro_" = 43 chars.
    return key.slice(0, MAX_LEN);
  }
  return key;
}
