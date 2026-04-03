/**
 * Global middleware — enforces authentication on /app/* and /api/app/* routes.
 * Redirects unauthenticated page requests to /sign-in and returns 401 for API calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SESSION_COOKIE = "revenue_session";

/** Routes that require authentication */
const PROTECTED_PAGE_PREFIX = "/app";
const PROTECTED_API_PREFIX = "/api/app";

/** Routes that should NOT be protected (public pages & APIs) */
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/activate",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth",
  "/api/public",
  "/api/agents/public",
  "/api/billing/webhook",
  "/api/contact",
  "/api/demo-request",
  "/api/cron",
  "/api/ops",
  "/api/admin",
  "/api/shared-transactions",
  "/api/voice",
  "/api/health",
  "/_next",
  "/favicon.ico",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only enforce auth on protected routes
  const isProtectedPage = pathname.startsWith(PROTECTED_PAGE_PREFIX) && !pathname.startsWith(PROTECTED_API_PREFIX);
  const isProtectedApi = pathname.startsWith(PROTECTED_API_PREFIX);

  if (!isProtectedPage && !isProtectedApi) return NextResponse.next();
  if (isPublicRoute(pathname)) return NextResponse.next();

  // Check for revenue_session cookie (fast path — no external call)
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);

  // Check for Supabase auth session
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    const response = NextResponse.next();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return response;
    }
  }

  // If either session exists, allow through
  if (hasSessionCookie) return NextResponse.next();

  // No valid session found
  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect page requests to sign-in with return URL
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("returnTo", pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    "/app/:path*",
    "/api/app/:path*",
  ],
};
