import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Enable standalone output for self-hosted Docker deployments.
  // When NEXT_OUTPUT_STANDALONE is unset (e.g. local dev), this defaults to undefined (normal mode).
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  async redirects() {
    return [
      { source: "/app/onboarding", destination: "/activate", permanent: false },
      { source: "/app/onboarding/:path*", destination: "/activate", permanent: false },
      { source: "/onboarding", destination: "/activate", permanent: false },
      { source: "/onboarding/:path*", destination: "/activate", permanent: false },
      { source: "/dashboard/onboarding", destination: "/activate", permanent: false },
      { source: "/dashboard/onboarding/:path*", destination: "/activate", permanent: false },
      { source: "/setup", destination: "/activate", permanent: false },
      { source: "/connect", destination: "/activate", permanent: false },
      { source: "/onboard", destination: "/activate", permanent: false },
      { source: "/onboard/:path*", destination: "/activate", permanent: false },
      // Dashboard consolidation — redirect ALL /dashboard/* to /app/*
      { source: "/dashboard", destination: "/app", permanent: true },
      // /app/activity never existed as a page; collapse it + its legacy alias to the dashboard.
      { source: "/dashboard/activity", destination: "/app/dashboard", permanent: true },
      { source: "/app/activity", destination: "/app/dashboard", permanent: true },
      { source: "/dashboard/analytics", destination: "/app/analytics", permanent: true },
      { source: "/dashboard/analytics/:path*", destination: "/app/analytics", permanent: true },
      { source: "/dashboard/billing", destination: "/app/settings/billing", permanent: true },
      { source: "/dashboard/billing/:path*", destination: "/app/settings/billing", permanent: true },
      { source: "/dashboard/calendar", destination: "/app/calendar", permanent: true },
      { source: "/dashboard/calls", destination: "/app/calls", permanent: true },
      { source: "/dashboard/calls/:path*", destination: "/app/calls", permanent: true },
      { source: "/dashboard/campaigns", destination: "/app/campaigns", permanent: true },
      { source: "/dashboard/campaigns/:path*", destination: "/app/campaigns", permanent: true },
      { source: "/dashboard/contacts", destination: "/app/contacts", permanent: true },
      { source: "/dashboard/contacts/:path*", destination: "/app/contacts", permanent: true },
      { source: "/dashboard/follow-ups", destination: "/app/follow-ups", permanent: true },
      { source: "/dashboard/follow-ups/:path*", destination: "/app/follow-ups", permanent: true },
      { source: "/dashboard/integrations", destination: "/app/settings/integrations", permanent: true },
      { source: "/dashboard/leads", destination: "/app/contacts", permanent: true },
      { source: "/dashboard/leads/:path*", destination: "/app/contacts", permanent: true },
      { source: "/dashboard/messages", destination: "/app/inbox", permanent: true },
      { source: "/dashboard/messages/:path*", destination: "/app/inbox", permanent: true },
      { source: "/dashboard/onboarding", destination: "/activate", permanent: true },
      { source: "/dashboard/pipeline", destination: "/app/contacts", permanent: true },
      { source: "/dashboard/reports", destination: "/app/analytics", permanent: true },
      { source: "/dashboard/revenue", destination: "/app/analytics", permanent: true },
      { source: "/dashboard/settings", destination: "/app/settings", permanent: true },
      { source: "/dashboard/settings/:path*", destination: "/app/settings", permanent: true },
      { source: "/dashboard/team", destination: "/app/settings/team", permanent: true },
      { source: "/dashboard/templates", destination: "/app/follow-ups", permanent: true },
      // Enterprise/operational pages → redirect to /app root
      { source: "/dashboard/admin", destination: "/app", permanent: true },
      { source: "/dashboard/admin/:path*", destination: "/app", permanent: true },
      { source: "/dashboard/approvals", destination: "/app", permanent: true },
      { source: "/dashboard/assurance", destination: "/app", permanent: true },
      { source: "/dashboard/attestations", destination: "/app", permanent: true },
      { source: "/dashboard/compliance", destination: "/app", permanent: true },
      { source: "/dashboard/connection", destination: "/app", permanent: true },
      { source: "/dashboard/context", destination: "/app", permanent: true },
      { source: "/dashboard/coverage", destination: "/app", permanent: true },
      { source: "/dashboard/delegation", destination: "/app", permanent: true },
      { source: "/dashboard/domains", destination: "/app", permanent: true },
      { source: "/dashboard/escalations", destination: "/app", permanent: true },
      { source: "/dashboard/import", destination: "/app/contacts", permanent: true },
      { source: "/dashboard/live", destination: "/app", permanent: true },
      { source: "/dashboard/policies", destination: "/app", permanent: true },
      { source: "/dashboard/preferences", destination: "/app/settings", permanent: true },
      { source: "/dashboard/presence", destination: "/app", permanent: true },
      { source: "/dashboard/procurement", destination: "/app", permanent: true },
      { source: "/dashboard/record", destination: "/app", permanent: true },
      { source: "/dashboard/recovery", destination: "/app", permanent: true },
      { source: "/dashboard/retention", destination: "/app", permanent: true },
      { source: "/dashboard/value", destination: "/app", permanent: true },
      // Catch-all for anything not explicitly mapped
      { source: "/dashboard/:path*", destination: "/app", permanent: true },
      // Common typos and crawlers
      { source: "/signin", destination: "/sign-in", permanent: true },
      { source: "/login", destination: "/sign-in", permanent: true },
      { source: "/signup", destination: "/activate", permanent: true },
      { source: "/register", destination: "/activate", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/start", destination: "/activate", permanent: false },
      { source: "/book-demo", destination: "/demo", permanent: false },
      { source: "/sitemaps.xml", destination: "/sitemap.xml", permanent: true },
    ];
  },
  // Allow overriding build output dir via env (used in CI/sandbox builds where .next is read-only).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Force new JS chunk hashes every build so browsers don't load stale bundles (fixes #418 from mixed deploys).
  generateBuildId: async () => `build-${Date.now()}`,
  experimental: {
    // Client router cache reuse (Next 16: static must be >= 30 when set).
    staleTimes: { dynamic: 0, static: 30 },
  },
  webpack: (config) => {
    // Sentry → @opentelemetry/instrumentation uses dynamic requires; harmless for our bundle.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      /Critical dependency: the request of a dependency is an expression/,
    ];
    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  async headers() {
    // NOTE: Content-Security-Policy is set from middleware.ts, not here.
    // The policy carries a per-request crypto-random nonce so script-src can
    // use `'strict-dynamic' 'nonce-…'` instead of `'unsafe-inline'`, which is
    // only possible from a runtime that sees each request (i.e. middleware).
    // Leaving CSP out of this static header block is intentional.
    //
    // Do not match `/_next/static`, `/_next/image`, or `favicon.ico` — Next sets cache for hashed assets;
    // applying `no-store` here would hurt caching and triggers Next's custom Cache-Control warning on /_next/static.
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          // Preconnect to external services for faster first-byte
          ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [{ key: "Link", value: `<${process.env.NEXT_PUBLIC_SUPABASE_URL}>; rel=preconnect` }] : []),
          { key: "Link", value: "<https://js.stripe.com>; rel=preconnect" },
        ],
      },
    ];
  },
};

// Phase 78 Task 11.3 — wrap with withSentryConfig so source maps upload in CI
// and release markers carry the commit SHA. Options are inert when the
// SENTRY_AUTH_TOKEN env var isn't set, so local builds are unaffected.
const sentryOptions = {
  // Quiet plugin output in local dev; CI prints full info via its own logs.
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Upload source maps only when an auth token is present (i.e. CI/release
  // builds). Skipping avoids build failures on dev machines with no token.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Tunnel rewrites Sentry's ingest path through our origin so ad-blockers
  // don't eat the event; keeps CSP connect-src scoped to `'self' + *.sentry.io`.
  tunnelRoute: "/monitoring",
  // Hide Sentry's own telemetry tracing in the build output — we already have
  // structured build logs from next and Vercel.
  hideSourceMaps: true,
  // Sentry v9+ moved these two options under `webpack`; leaving them top-level
  // emits deprecation warnings that add noise to every CI build.
  webpack: {
    // Strip the Sentry SDK's own debug logging from production bundles.
    treeshake: { removeDebugLogging: true },
    // Skip the Vercel Cron → Sentry Monitors wiring in preview builds.
    automaticVercelMonitors: false,
  },
};

export default withSentryConfig(withNextIntl(nextConfig), sentryOptions);
