/**
 * 1) Ops routes: require staff session.
 * 2) App session: restore auth cookie on every request so reload/tab/return never asks for email again.
 *    Dashboard and protected APIs require session; missing session → redirect to /activate or 401.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSessionFromCookie,
  createSessionCookie,
  getSessionCookieName,
  isSessionEnabled,
} from "@/lib/auth/session";

function isOpsRoute(pathname: string): boolean {
  return pathname.startsWith("/ops") || pathname.startsWith("/api/ops");
}

function isOpsAuthRoute(pathname: string): boolean {
  return pathname === "/ops/login" || pathname.startsWith("/api/ops/auth");
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/activate" || pathname === "/connect" || pathname === "/live") return true;
  if (pathname.startsWith("/api/trial/start")) return true;
  if (pathname.startsWith("/api/billing/checkout")) return true;
  if (pathname.startsWith("/api/billing/webhook")) return true;
  if (pathname.startsWith("/api/billing/")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/api/webhooks/inbound-generic")) return true;
  if (pathname.startsWith("/api/integrations/twilio/auto-provision")) return true;
  if (pathname.startsWith("/api/dev/simulate-inbound")) return true;
  if (pathname.startsWith("/api/conversations/") && pathname.includes("/messages")) return true;
  if (pathname === "/api/auth/session" || pathname === "/api/auth/logout") return true;
  if (pathname === "/api/health") return true;
  return false;
}

function isDashboardOrApi(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/api/");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ——— Ops: staff session only ———
  if (isOpsRoute(pathname)) {
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

  // ——— App: restore session on dashboard + protected API ———
  if (!isDashboardOrApi(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  if (!isSessionEnabled()) {
    return NextResponse.next();
  }

  const cookieHeader = req.cookies.get(getSessionCookieName())?.value ?? null;
  const session = getSessionFromCookie(cookieHeader);

  // No session: redirect dashboard to activate, API to 401
  // BUT: if workspace_id is in query params, allow access (for post-checkout redirects)
  if (!session) {
    const workspaceIdParam = req.nextUrl.searchParams.get("workspace_id");
    if (pathname.startsWith("/dashboard")) {
      // Allow dashboard access if workspace_id is in URL (post-checkout flow)
      if (workspaceIdParam) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/activate", req.url));
    }
    if (pathname.startsWith("/api/")) {
      // Allow API access if workspace_id is in query (for connect/live pages)
      if (workspaceIdParam && (pathname.includes("/command-center") || pathname.includes("/integrations"))) {
        return NextResponse.next();
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Session valid: refresh cookie (extend expiry) and continue
  const refreshedCookie = createSessionCookie({
    userId: session.userId,
    workspaceId: session.workspaceId,
  });
  if (refreshedCookie) {
    const res = NextResponse.next();
    res.headers.set("Set-Cookie", refreshedCookie);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ops/:path*", "/api/ops/:path*", "/dashboard/:path*", "/api/:path*"],
};
