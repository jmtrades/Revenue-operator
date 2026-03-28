/**
 * Stripe Setup: Create products and prices for Recall Touch
 *
 * Creates 3 products (Solo/Starter, Business/Growth, Scale/Business) with monthly + annual prices.
 * Outputs env vars to add to Vercel.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe.ts
 *
 * For live mode:
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/setup-stripe.ts
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not set. Run with:\n  STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe.ts");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

interface TierConfig {
  envPrefix: string;
  productName: string;
  productDescription: string;
  monthlyAmountCents: number;
  annualAmountCents: number;
}

const TIERS: TierConfig[] = [
  {
    envPrefix: "SOLO",
    productName: "Recall Touch — Starter",
    productDescription: "1 AI Agent, 1000 min/month, 1 Phone Number",
    monthlyAmountCents: 14700, // $147/mo
    annualAmountCents: 147000, // $1,470/yr ($122.50/mo effective — 2 months free)
  },
  {
    envPrefix: "BUSINESS",
    productName: "Recall Touch — Growth",
    productDescription: "5 AI Agents, 3000 min/month, 5 Phone Numbers",
    monthlyAmountCents: 29700, // $297/mo
    annualAmountCents: 297000, // $2,970/yr ($247.50/mo effective)
  },
  {
    envPrefix: "SCALE",
    productName: "Recall Touch — Business",
    productDescription: "15 AI Agents, 8000 min/month, 15 Phone Numbers",
    monthlyAmountCents: 59700, // $597/mo
    annualAmountCents: 597000, // $5,970/yr ($497.50/mo effective)
  },
];

async function findOrCreateProduct(name: string, description: string): Promise<string> {
  const products = await stripe.products.list({ limit: 100 });
  const existing = products.data.find((p) => p.name === name && p.active);
  if (existing) {
    console.log(`  ✓ Product "${name}" exists (${existing.id})`);
    return existing.id;
  }
  const product = await stripe.products.create({ name, description });
  console.log(`  ✓ Created product "${name}" (${product.id})`);
  return product.id;
}

async function findOrCreatePrice(
  productId: string,
  amountCents: number,
  interval: "month" | "year",
  label: string,
): Promise<string> {
  const prices = await stripe.prices.list({ product: productId, limit: 100 });
  const existing = prices.data.find(
    (p) =>
      p.active &&
      p.type === "recurring" &&
      p.recurring?.interval === interval &&
      p.currency === "usd" &&
      p.unit_amount === amountCents,
  );
  if (existing) {
    console.log(`  ✓ Price ${label} exists (${existing.id})`);
    return existing.id;
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency: "usd",
    recurring: { interval },
  });
  console.log(`  ✓ Created price ${label} (${price.id})`);
  return price.id;
}

async function setupWebhook(appUrl: string): Promise<void> {
  const webhookUrl = `${appUrl}/api/billing/webhook`;
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = endpoints.data.find((e) => e.url === webhookUrl && e.status === "enabled");
  if (existing) {
    console.log(`\n  ✓ Webhook endpoint exists: ${webhookUrl}`);
    console.log(`    Secret: already configured (check Stripe Dashboard)`);
    return;
  }
  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
    ],
  });
  console.log(`\n  ✓ Created webhook endpoint: ${webhookUrl}`);
  console.log(`    ⚠️  STRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
}

async function main() {
  console.log("🔧 Setting up Stripe for Recall Touch\n");
  console.log(`   Mode: ${STRIPE_SECRET_KEY.startsWith("sk_live") ? "🔴 LIVE" : "🟡 TEST"}\n`);

  const envVars: Record<string, string> = {};

  for (const tier of TIERS) {
    console.log(`\n── ${tier.productName} ──`);
    const productId = await findOrCreateProduct(tier.productName, tier.productDescription);

    const monthlyLabel = `${tier.envPrefix} Monthly ($${(tier.monthlyAmountCents / 100).toFixed(0)}/mo)`;
    const annualLabel = `${tier.envPrefix} Annual ($${(tier.annualAmountCents / 100).toFixed(0)}/yr)`;

    const monthlyPriceId = await findOrCreatePrice(productId, tier.monthlyAmountCents, "month", monthlyLabel);
    const annualPriceId = await findOrCreatePrice(productId, tier.annualAmountCents, "year", annualLabel);

    envVars[`STRIPE_PRICE_${tier.envPrefix}_MONTH`] = monthlyPriceId;
    envVars[`STRIPE_PRICE_${tier.envPrefix}_YEAR`] = annualPriceId;
  }

  // Try to set up webhook
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com";
  try {
    await setupWebhook(appUrl);
  } catch (err) {
    console.log(`\n  ⚠️  Could not auto-create webhook: ${err instanceof Error ? err.message : err}`);
    console.log(`     Create manually in Stripe Dashboard → Webhooks → Add endpoint`);
    console.log(`     URL: ${appUrl}/api/billing/webhook`);
  }

  // Output env vars
  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("  ADD THESE TO VERCEL ENVIRONMENT VARIABLES:");
  console.log("═══════════════════════════════════════════════════════\n");

  for (const [key, value] of Object.entries(envVars)) {
    console.log(`${key}=${value}`);
  }

  console.log(`\n# Also ensure these are set:`);
  console.log(`STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY.slice(0, 12)}...`);
  console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...`);
  console.log(`STRIPE_WEBHOOK_SECRET=whsec_...`);

  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("  VERCEL CLI (paste all at once):");
  console.log("═══════════════════════════════════════════════════════\n");

  for (const [key, value] of Object.entries(envVars)) {
    console.log(`npx vercel env add ${key} production <<< "${value}"`);
  }

  console.log("\n✅ Stripe setup complete!\n");
}

main().catch((error) => {
  console.error("❌ Stripe setup failed:", error);
  process.exit(1);
});
