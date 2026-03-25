/**
 * Stripe setup: Create product and price if missing
 * Saves STRIPE_PRICE_ID to .env.local
 */

import Stripe from "stripe";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not set");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);
const PRODUCT_NAME = "Revenue Continuity";
const CURRENCY = "gbp"; // Change to "usd" if needed
const AMOUNT = 4900; // £49/month in pence (adjust as needed)

async function setupStripe() {
  console.log("🔧 Setting up Stripe product and price...\n");

  // Find or create product
  let productId: string;
  const products = await stripe.products.list({ limit: 100 });
  const existing = products.data.find((p) => p.name === PRODUCT_NAME);

  if (existing) {
    console.log(`✓ Product "${PRODUCT_NAME}" exists (${existing.id})`);
    productId = existing.id;
  } else {
    const product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: "Background conversation continuity operator",
    });
    console.log(`✓ Created product "${PRODUCT_NAME}" (${product.id})`);
    productId = product.id;
  }

  // Find or create price
  const prices = await stripe.prices.list({ product: productId, limit: 100 });
  const existingPrice = prices.data.find(
    (p) =>
      p.type === "recurring" &&
      p.recurring?.interval === "month" &&
      p.currency === CURRENCY &&
      p.unit_amount === AMOUNT
  );

  let priceId: string;
  if (existingPrice) {
    console.log(`✓ Price exists (${existingPrice.id})`);
    priceId = existingPrice.id;
  } else {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: AMOUNT,
      currency: CURRENCY,
      recurring: {
        interval: "month",
      },
      metadata: {
        trial_period_days: "14",
      },
    });
    console.log(`✓ Created price (${price.id})`);
    priceId = price.id;
  }

  // Update .env.local
  const envPath = join(process.cwd(), ".env.local");
  let envContent = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";

  if (envContent.includes("STRIPE_PRICE_ID=")) {
    envContent = envContent.replace(/STRIPE_PRICE_ID=.*/g, `STRIPE_PRICE_ID=${priceId}`);
  } else {
    envContent += `\nSTRIPE_PRICE_ID=${priceId}\n`;
  }

  writeFileSync(envPath, envContent);
  console.log(`\n✓ Updated .env.local with STRIPE_PRICE_ID=${priceId}`);
  console.log(`\n✅ Stripe setup complete!\n`);
  console.log(`Price ID: ${priceId}`);
  console.log(`Add this to production: STRIPE_PRICE_ID=${priceId}\n`);
}

setupStripe().catch((error) => {
  console.error("❌ Stripe setup failed:", error);
  process.exit(1);
});
