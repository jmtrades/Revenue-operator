import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force new JS chunk hashes every build so browsers don't load stale bundles (fixes #418 from mixed deploys).
  generateBuildId: async () => `build-${Date.now()}`,
  experimental: {
    // Force RSC/router to not serve stale cached segments (avoids mixed deploy #418).
    staleTimes: { dynamic: 0, static: 0 },
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
      "media-src 'self' data: blob: https: https://api.elevenlabs.io",
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

export default nextConfig;
