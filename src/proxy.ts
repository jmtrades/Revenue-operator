/**
 * 1) Ops routes: require staff session.
 * 2) App session: restore auth cookie on dashboard; missing session → redirect (GET only).
 * 3) Public and API bypass: explicit list; never redirect POST, never block webhooks or public API.
 *
 * Next.js 16: proxy (formerly middleware) — request boundary in front of the app.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSessionFromCookieAsync,
  createSessionCookieAsync,
  getSessionCookieName,
  isSessionEnabled,
} from "@/lib/auth/session-edge";

function isPublicPage(pathname: string): boolean {
  if (pathname === "/" || pathname === "/activate" || pathname === "/connect" || pathname === "/live") return true;
  if (pathname === "/sign-in" || pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/onboard") || pathname.startsWith("/onboarding") || pathname.startsWith("/public/work")) return true;
  if (pathname === "/demo" || pathname === "/product" || pathname === "/pricing" || pathname === "/docs") return true;
  if (pathname === "/contact" || pathname === "/blog" || pathname === "/privacy" || pathname === "/terms") return true;
  if (pathname.startsWith("/industries/")) return true;
  return false;
}

function isPublicApi(pathname: string): boolean {
  if (pathname.startsWith("/api/public/")) return true;
  if (pathname.startsWith("/api/onboard/") || pathname.startsWith("/api/onboarding/")) return true;
  if (pathname.startsWith("/api/trial/")) return true;
  if (pathname === "/api/billing/webhook" || pathname === "/api/billing/checkout") return true;
  if (pathname.startsWith("/api/billing/")) return true;
  if (pathname === "/api/system/core-status") return true;
  if (pathname === "/api/system/health") return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/vapi/demo-config") return true;
  if (pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/integrations/twilio")) return true;
  if (pathname.startsWith("/api/command-center")) return true;
  if (pathname.startsWith("/api/dev/simulate-inbound")) return true;
  if (pathname.startsWith("/api/integrations/twilio/auto-provision")) return true;
  if (pathname.startsWith("/api/conversations/") && pathname.includes("/messages")) return true;
  if (pathname === "/api/signup" || pathname === "/api/contact" || pathname === "/api/waitlist") return true;
  return false;
}

function isOpsRoute(pathname: string): boolean {
  return pathname.startsWith("/ops") || pathname.startsWith("/api/ops");
}

function isOpsAuthRoute(pathname: string): boolean {
  return pathname === "/ops/login" || pathname.startsWith("/api/ops/auth");
}

function isDashboardOrApi(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/api/");
}

function isAllowedDashboardPath(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname === "/dashboard/onboarding" || pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/")) return true;
  if (pathname === "/dashboard/record" || pathname === "/dashboard/activity" || pathname === "/dashboard/presence" || pathname === "/dashboard/approvals") return true;
  if (pathname === "/dashboard/preferences" || pathname === "/dashboard/connection" || pathname === "/dashboard/billing") return true;
  if (pathname === "/dashboard/contacts" || pathname === "/dashboard/calendar" || pathname === "/dashboard/analytics" || pathname === "/dashboard/team" || pathname === "/dashboard/integrations") return true;
  if (pathname === "/dashboard/calls" || pathname === "/dashboard/messages" || pathname.startsWith("/dashboard/messages/")) return true;
  if (pathname.startsWith("/dashboard/campaigns") || pathname.startsWith("/dashboard/agents")) return true;
  if (pathname.startsWith("/dashboard/record/lead/")) return true;
  if (pathname === "/dashboard/start" || pathname === "/dashboard/compliance" || pathname === "/dashboard/policies") return true;
  if (pathname.startsWith("/dashboard/policies/") || pathname === "/dashboard/templates" || pathname === "/dashboard/follow-ups" || pathname === "/dashboard/escalations") return true;
  if (pathname === "/dashboard/import" || pathname === "/dashboard/activation" || pathname === "/dashboard/continue-protection") return true;
  return false;
}

function getDashboardRedirect(pathname: string): string | null {
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

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method ?? "GET";

  // ——— API routes: never return HTML, never redirect POST ———
  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname)) return NextResponse.next();
    if (method !== "GET" && method !== "HEAD") {
      // POST/PUT/DELETE to protected API: do not redirect, return 401 if no session
      if (!isSessionEnabled()) return NextResponse.next();
      const cookieHeader = req.cookies.get(getSessionCookieName())?.value ?? null;
      const session = await getSessionFromCookieAsync(cookieHeader);
      if (!session) {
        const workspaceIdParam = req.nextUrl.searchParams.get("workspace_id");
        if (workspaceIdParam) return NextResponse.next();
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const refreshedCookie = await createSessionCookieAsync({ userId: session.userId, workspaceId: session.workspaceId });
      if (refreshedCookie) {
        const res = NextResponse.next();
        res.headers.set("Set-Cookie", refreshedCookie);
        return res;
      }
      return NextResponse.next();
    }
    // GET to protected API: same as below when we get to dashboard/API branch
  }

  // ——— Public pages: never redirect, never require session ———
  if (isPublicPage(pathname)) return NextResponse.next();

  // ——— Ops: staff session only ———
  if (isOpsRoute(pathname)) {
    if (isOpsAuthRoute(pathname)) return NextResponse.next();
    const sessionCookie = req.cookies.get("ops_session")?.value;
    if (!sessionCookie) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/ops/login", req.url));
    }
    return NextResponse.next();
  }

  // ——— Dashboard redirects (legacy URLs): only for GET, never redirect POST ———
  if (method === "GET" && shouldRedirectDashboard(pathname)) {
    const target = getRedirectTarget(pathname);
    const url = new URL(target, req.url);
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
    return NextResponse.redirect(url);
  }

  // ——— App and dashboard: require session ———
  const isApp = pathname.startsWith("/app");
  if (!isDashboardOrApi(pathname) && !isApp) return NextResponse.next();
  if (isPublicApi(pathname)) return NextResponse.next();
  if (!isSessionEnabled()) return NextResponse.next();

  const cookieHeader = req.cookies.get(getSessionCookieName())?.value ?? null;
  const session = await getSessionFromCookieAsync(cookieHeader);

  if (!session) {
    const workspaceIdParam = req.nextUrl.searchParams.get("workspace_id");
    if (pathname.startsWith("/dashboard") && workspaceIdParam) return NextResponse.next();
    if (pathname.startsWith("/api/") && workspaceIdParam) return NextResponse.next();
    if (isApp) return NextResponse.redirect(new URL("/sign-in", req.url));
    if (pathname.startsWith("/dashboard")) return NextResponse.redirect(new URL("/activate", req.url));
    if (pathname.startsWith("/admin")) return NextResponse.redirect(new URL("/activate", req.url));
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

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
  matcher: [
    "/",
    "/activate",
    "/connect",
    "/live",
    "/sign-in",
    "/demo",
    "/product",
    "/pricing",
    "/docs",
    "/contact",
    "/blog",
    "/privacy",
    "/terms",
    "/industries/:path*",
    "/onboard/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/public/work/:path*",
    "/ops/:path*",
    "/api/ops/:path*",
    "/admin",
    "/admin/:path*",
    "/app",
    "/app/:path*",
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
