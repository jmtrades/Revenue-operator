import Stripe from "stripe";

const OVERAGE_RATES: Record<string, number> = {
  solo: 25,
  growth: 18,
  team: 12,
  enterprise: 10,
};

export async function reportUsageOverage(
  workspaceId: string,
  subscriptionId: string,
  tier: string,
  minutesUsed: number,
  minutesIncluded: number
) {
  if (!process.env.STRIPE_SECRET_KEY) return;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" as any });
  const overageMinutes = Math.max(0, minutesUsed - minutesIncluded);
  if (overageMinutes <= 0) return;

  const ratePerMin = OVERAGE_RATES[tier] || 25;
  const overageAmountCents = overageMinutes * ratePerMin;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.customer as string;

  await stripe.invoiceItems.create({
    customer: customerId,
    amount: overageAmountCents,
    currency: "usd",
    description: `Voice overage: ${overageMinutes} minutes × $${(ratePerMin / 100).toFixed(2)}/min`,
    metadata: { workspace_id: workspaceId, overage_minutes: String(overageMinutes) },
  });
}

