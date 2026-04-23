/**
 * Phase 78 / Phase 6 (P0-10 Payments): the ONE place in the codebase that
 * may construct a Stripe client. Enforced by
 * `__tests__/security/stripe-single-factory.test.ts`.
 *
 * Why a single factory:
 *
 *   - apiVersion pin: every call site sees the same serialization rules.
 *     Before this consolidation we had routes that pinned nothing (latest-
 *     at-request-time), routes on older pins, and routes that disagreed
 *     about which `.acacia` version to speak. A webhook handler speaking a
 *     different apiVersion than the checkout route can deserialize the same
 *     Event payload into subtly different shapes.
 *
 *   - PCI audit surface: auditors ask "show me every place you talk to
 *     Stripe." One file, one answer.
 *
 *   - Key rotation: rotating STRIPE_SECRET_KEY in env is the entire
 *     rollout. No stray `new Stripe(process.env.FOO)` still holding the
 *     previous value in a hot singleton elsewhere.
 *
 * Key precedence matches what the old reconciliation code did
 * (`STRIPE_SECRET_KEY ?? STRIPE_API_KEY`) so migrating those call sites is
 * behaviour-preserving.
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Singleton Stripe client. Pinned apiVersion ensures consistent behaviour
 * across all call-sites (webhooks, checkout, billing cron, etc.).
 *
 * Throws if neither `STRIPE_SECRET_KEY` nor the legacy `STRIPE_API_KEY`
 * fallback is configured — rather than constructing a Stripe client with an
 * empty key, which fails later with an opaque 401.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  // Prefer STRIPE_SECRET_KEY (canonical); fall back to STRIPE_API_KEY
  // (legacy name used by reconciliation providers). Both empty → throw.
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set it in your environment variables.",
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2024-12-18.acacia" as unknown as Stripe.StripeConfig["apiVersion"],
  });
  return _stripe;
}

/**
 * Test-only reset hook. Vitest runs share a module graph; some suites mutate
 * env vars mid-run and need the cached singleton cleared so the next
 * `getStripe()` re-reads env. Not exported from a barrel on purpose — it's
 * plumbing, not API.
 */
export function __resetStripeForTests(): void {
  _stripe = null;
}
