"use client";

import Script from "next/script";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const PRICING_TABLE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID ?? "";

export function StripePricingTable() {
  if (!PUBLISHABLE_KEY || !PRICING_TABLE_ID) {
    return (
      <div className="max-w-3xl mx-auto rounded-xl border border-stone-700 bg-stone-900/40 p-8 text-center">
        <p className="text-stone-500 text-sm">
          Configure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID to show the pricing table.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://js.stripe.com/v3/pricing-table.js"
        strategy="lazyOnload"
      />
      <div className="max-w-4xl mx-auto flex justify-center [&_iframe]:min-h-[600px]">
        {/* @ts-expect-error custom element from Stripe script */}
        <stripe-pricing-table
          pricing-table-id={PRICING_TABLE_ID}
          publishable-key={PUBLISHABLE_KEY}
        />
      </div>
    </>
  );
}
