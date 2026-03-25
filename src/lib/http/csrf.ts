import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Basic CSRF protection for state-mutating routes.
 * Validates that the Origin header matches NEXT_PUBLIC_APP_URL when present.
 * If Origin is missing (e.g. non-browser clients), the check is skipped.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Non-browser or same-origin navigations without Origin header.
    return null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: "App URL not configured", code: "missing_app_url" },
      { status: 503 },
    );
  }

  try {
    const originUrl = new URL(origin);
    const app = new URL(appUrl);

    const sameHost =
      originUrl.protocol === app.protocol &&
      originUrl.hostname === app.hostname &&
      (originUrl.port || "") === (app.port || "");

    if (!sameHost) {
      return NextResponse.json(
        { error: "Invalid request origin", code: "invalid_origin" },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid Origin header", code: "invalid_origin" },
      { status: 400 },
    );
  }

  return null;
}

