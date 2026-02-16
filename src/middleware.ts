/**
 * 1) Ops routes: require staff session.
 * 2) App session: restore auth cookie on every request so reload/tab/return never asks for email again.
 *    Dashboard and protected APIs require session; missing session → redirect to /activate or 401.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSessionFromCookieAsync,
  createSessionCookieAsync,
  getSessionCookieName,
  isSessionEnabled,
} from "@/lib/auth/session-edge";

function isOpsRoute(pathname: string): boolean {
  return pathname.startsWith("/ops") || pathname.startsWith("/api/ops");
}

function isOpsAuthRoute(pathname: string): boolean {
  return pathname === "/ops/login" || pathname.startsWith("/api/ops/auth");
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/activate" || pathname === "/connect" || pathname === "/live") return true;
  if (pathname.startsWith("/onboard")) return true;
  if (pathname.startsWith("/public/work")) return true;
  if (pathname.startsWith("/api/trial/start")) return true;
  if (pathname.startsWith("/api/billing/checkout")) return true;
  if (pathname.startsWith("/api/billing/webhook")) return true;
  if (pathname.startsWith("/api/billing/")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/api/webhooks/inbound-generic")) return true;
  if (pathname.startsWith("/api/integrations/twilio/auto-provision")) return true;
  if (pathname.startsWith("/api/command-center")) return true;
  if (pathname.startsWith("/api/dev/simulate-inbound")) return true;
  if (pathname.startsWith("/api/conversations/") && pathname.includes("/messages")) return true;
  if (pathname === "/api/auth/session" || pathname === "/api/auth/logout") return true;
  if (pathname === "/api/health" || pathname === "/api/health/cron") return true;
  if (pathname.startsWith("/api/public/")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  return false;
}

function isDashboardOrApi(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/api/");
}

/** Operational environment: only four surfaces + record/lead/[id], preferences, connection. */
const ALLOWED_DASHBOARD_PREFIXES = [
  "/dashboard",           // exact or Situation
  "/dashboard/record",
  "/dashboard/activity",
  "/dashboard/presence",
  "/dashboard/preferences",
  "/dashboard/connection",
];
function isAllowedDashboardPath(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname === "/dashboard/record" || pathname === "/dashboard/activity" || pathname === "/dashboard/presence") return true;
  if (pathname === "/dashboard/preferences" || pathname === "/dashboard/connection") return true;
  if (pathname.startsWith("/dashboard/record/lead/")) return true;
  return false;
}
/** Redirect legacy URLs to canonical ones. */
function getDashboardRedirect(pathname: string): string | null {
  if (pathname === "/dashboard/settings") return "/dashboard/preferences";
  if (pathname === "/dashboard/activation") return "/dashboard/connection";
  if (pathname === "/dashboard/continue-protection") return "/dashboard";
  if (pathname === "/dashboard/leads" || pathname === "/dashboard/conversations") return "/dashboard/activity";
  if (pathname.startsWith("/dashboard/leads/")) {
    const id = pathname.replace(/^\/dashboard\/leads\//, "").split("/")[0];
    return id ? `/dashboard/record/lead/${id}` : "/dashboard";
  }
  return null;
}
function shouldRedirectDashboard(pathname: string): boolean {
  const legacy = getDashboardRedirect(pathname);
  if (legacy) return true;
  if (!pathname.startsWith("/dashboard")) return false;
  return !isAllowedDashboardPath(pathname);
}
function getRedirectTarget(pathname: string): string {
  const legacy = getDashboardRedirect(pathname);
  if (legacy) return legacy;
  return "/dashboard";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ——— Operational environment: only four surfaces + drill-in + deep-link ———
  if (shouldRedirectDashboard(pathname)) {
    const target = getRedirectTarget(pathname);
    const url = new URL(target, req.url);
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
    return NextResponse.redirect(url);
  }

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

  // ——— App: restore session on dashboard + protected API (Edge-compatible) ———
  if (!isDashboardOrApi(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  if (!isSessionEnabled()) {
    return NextResponse.next();
  }

  const cookieHeader = req.cookies.get(getSessionCookieName())?.value ?? null;
  const session = await getSessionFromCookieAsync(cookieHeader);

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
      // Allow API access if workspace_id in query (for connect/live) or public API
      if (workspaceIdParam) return NextResponse.next();
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Session valid: refresh cookie (extend expiry) and continue
  const refreshedCookie = await createSessionCookieAsync({
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
