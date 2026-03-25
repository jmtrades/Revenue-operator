import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Singleton Stripe client. Uses a fixed apiVersion to ensure consistent
 * behaviour across all call-sites (webhooks, checkout, billing cron, etc.).
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Set it in your environment variables.");
  }
  _stripe = new Stripe(key, {
    apiVersion: "2024-12-18.acacia" as unknown as Stripe.StripeConfig["apiVersion"],
  });
  return _stripe;
}
