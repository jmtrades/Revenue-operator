/**
 * Print every URL with your app domain that must be added to external services.
 * Run: BASE_URL=https://recall-touch.com npx tsx scripts/print-domain-urls.ts
 * Or: npm run urls:list
 *
 * These cannot be "pushed" from the repo — Supabase, Stripe, Zoom, etc. require
 * you to add redirect/webhook URLs in their dashboards (or via their APIs).
 * This script gives you one place to copy from.
 */

const domain =
  process.env.BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://recall-touch.com";

const base = domain.replace(/\/$/, "");

const urls = {
  supabase: {
    siteUrl: base,
    redirectUrls: [
      `${base}/auth/callback`,
      `${base}/auth/callback?next=/dashboard`,
      `${base}/auth/callback?next=/dashboard/onboarding`,
      `${base}/sign-in`,
    ],
  },
  stripe: {
    webhook: `${base}/api/billing/webhook`,
    checkoutSuccess: `${base}/connect`,
    checkoutCancel: `${base}/activate?canceled=1`,
  },
  zoom: {
    oauthRedirect: `${base}/api/integrations/zoom/callback`,
  },
  webhooks: {
    vapi: `${base}/api/webhooks/vapi`,
    twilioVoice: `${base}/api/webhooks/twilio/voice`,
    twilioStatus: `${base}/api/webhooks/twilio/status`,
    zoom: `${base}/api/webhooks/zoom`,
  },
  cron: `${base}/api/cron/core`,
  localhost: {
    supabase: [
      "http://localhost:3000/auth/callback",
      "http://localhost:3000/auth/callback?next=/dashboard/onboarding",
    ],
    stripe: "http://localhost:3000/api/billing/webhook",
    zoom: "http://localhost:3000/api/integrations/zoom/callback",
  },
};

function section(title: string, lines: string[]) {
  console.log(`\n${title}`);
  console.log("-".repeat(40));
  lines.forEach((u) => console.log(u));
}

console.log(`\nDomain: ${base}`);
console.log("Add these URLs in each service's dashboard (or API).\n");

section("Supabase → Authentication → URL configuration", [
  "Site URL:",
  `  ${urls.supabase.siteUrl}`,
  "",
  "Redirect URLs (add each, or use wildcard if supported):",
  ...urls.supabase.redirectUrls.map((u) => `  ${u}`),
]);

section("Stripe → Webhooks", [
  `  ${urls.stripe.webhook}`,
  "",
  "Checkout redirects (app uses these; no Stripe config needed):",
  `  Success: ${urls.stripe.checkoutSuccess}`,
  `  Cancel:  ${urls.stripe.checkoutCancel}`,
]);

section("Zoom → OAuth → Redirect URI", [urls.zoom.oauthRedirect]);

section("Webhooks (inbound – add in each provider)", [
  `Vapi:        ${urls.webhooks.vapi}`,
  `Twilio voice: ${urls.webhooks.twilioVoice}`,
  `Twilio status: ${urls.webhooks.twilioStatus}`,
  `Zoom:        ${urls.webhooks.zoom}`,
]);

section("Cron (e.g. Vercel Cron)", [urls.cron]);

section("Localhost (for local dev in Supabase/Stripe/Zoom)", [
  ...urls.localhost.supabase,
  urls.localhost.stripe,
  urls.localhost.zoom,
]);

console.log("\n");
