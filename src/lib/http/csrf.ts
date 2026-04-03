import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Canonical production domains. CSRF accepts these regardless of
 * NEXT_PUBLIC_APP_URL so a stale env var can never lock out real users.
 */
const PRODUCTION_HOSTS = new Set([
  "recall-touch.com",
  "www.recall-touch.com",
  "revenueoperator.ai",
  "www.revenueoperator.ai",
]);

/**
 * Basic CSRF protection for state-mutating routes.
 * Validates that the Origin header matches a known production host or
 * the configured NEXT_PUBLIC_APP_URL. If Origin is missing (e.g.
 * non-browser clients), the check is skipped.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Non-browser or same-origin navigations without Origin header.
    return null;
  }

  try {
    const originUrl = new URL(origin);

    // Allow any known production host
    if (PRODUCTION_HOSTS.has(originUrl.hostname)) {
      return null;
    }

    // Also allow the configured app URL (covers preview/staging deployments)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const app = new URL(appUrl);
      const sameHost =
        originUrl.protocol === app.protocol &&
        originUrl.hostname === app.hostname &&
        (originUrl.port || "") === (app.port || "");
      if (sameHost) return null;
    }

    // Allow Vercel preview deployments (*.vercel.app)
    if (originUrl.hostname.endsWith(".vercel.app")) {
      return null;
    }

    return NextResponse.json(
      { error: "Invalid request origin", code: "invalid_origin" },
      { status: 403 },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid Origin header", code: "invalid_origin" },
      { status: 400 },
    );
  }
}

