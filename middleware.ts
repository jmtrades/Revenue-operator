import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("revenue_session");

  const publicPaths = [
    "/",
    "/sign-in",
    "/sign-up",
    "/activate",
    "/pricing",
    "/product",
    "/demo",
    "/about",
    "/contact",
    "/industries",
    "/compare",
    "/blog",
    "/privacy",
    "/terms",
    "/api/auth",
    "/api/billing/webhook",
    "/api/vapi",
    "/api/twilio",
    "/accept-invite",
    "/reset-password",
    "/forgot-password",
  ];

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/app") || pathname.startsWith("/admin") || pathname.startsWith("/ops")) {
    if (!session) {
      const url = new URL("/sign-in", request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

