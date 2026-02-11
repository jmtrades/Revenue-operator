/**
 * Ops routes require staff session cookie.
 * No ops endpoint callable without staff auth.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isOpsRoute(pathname: string): boolean {
  return pathname.startsWith("/ops") || pathname.startsWith("/api/ops");
}

function isOpsAuthRoute(pathname: string): boolean {
  return pathname === "/ops/login" || pathname.startsWith("/api/ops/auth");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isOpsRoute(pathname)) return NextResponse.next();
  if (isOpsAuthRoute(pathname)) return NextResponse.next();

  const sessionCookie = req.cookies.get("ops_session")?.value;
  if (!sessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/ops/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ops/:path*", "/api/ops/:path*"],
};
