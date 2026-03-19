import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
      { source: "/dashboard/activity", destination: "/app/activity", permanent: true },
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
    ];
  },
  // Force new JS chunk hashes every build so browsers don't load stale bundles (fixes #418 from mixed deploys).
  generateBuildId: async () => `build-${Date.now()}`,
  experimental: {
    // Minimize stale RSC cache (Next 16 requires static >= 30 if set).
    staleTimes: { dynamic: 0, static: 30 },
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
    // Next.js App Router requires inline styles/scripts for hydration and streaming.
    // Keep this policy strict on origins, but allow inline for style/script so pages do not render blank.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "connect-src 'self' https: wss:",
      "img-src 'self' data: https:",
      "media-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
    ].join("; ");

    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
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
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
