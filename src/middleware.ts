import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware: protects /app/* routes by checking for an auth cookie.
 * If neither a Supabase auth cookie nor the revenue_session cookie is present,
 * redirect to /sign-in. This is a fast, edge-compatible check — full session
 * validation still happens server-side in the app layout and API routes.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /app routes
  if (!pathname.startsWith("/app")) return NextResponse.next();

  // Check for any Supabase auth cookie (sb-*-auth-token) or our custom session
  const hasSupabaseCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );
  const hasRevenueCookie = request.cookies.has("revenue_session");

  if (!hasSupabaseCookie && !hasRevenueCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
