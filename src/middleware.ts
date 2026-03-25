/**
 * Edge middleware — auth redirect, locale, security.
 * Runs before every matched request at the Vercel Edge.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookieAsync } from "@/lib/auth/session-edge";

/** Paths that require authentication */
const PROTECTED_PREFIXES = ["/app", "/admin"];

/** Paths that authenticated users should skip (redirect to dashboard) */
const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];

/** Paths that should never go through middleware */
const PUBLIC_PREFIXES = [
  "/api/",
  "/_next/",
  "/static/",
  "/favicon.ico",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/icon",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public assets and API routes
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Get session from cookie (edge-compatible, no Node APIs)
  const cookieHeader = request.headers.get("cookie");
  const session = await getSessionFromCookieAsync(cookieHeader);

  // Protected routes: redirect unauthenticated users to sign-in
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!session?.userId) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Auth pages: redirect authenticated users to dashboard
  if (AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(page + "/"))) {
    if (session?.userId) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images.
     * This negative lookahead excludes Next.js internals and common static files.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
