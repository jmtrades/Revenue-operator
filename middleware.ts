import { NextRequest, NextResponse } from "next/server";

const LOCALES = new Set(["en", "es", "fr", "de", "pt", "ja"]);
const LOCALE_COOKIE = "rt_locale";

/**
 * Middleware: forwards request URL as x-url header so server components can
 * read query parameters (e.g. ?locale=es). Also persists ?locale= to cookie
 * so subsequent navigations without the query param keep the chosen locale.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Forward full URL so getRequestConfig can read ?locale= from headers
  res.headers.set("x-url", req.nextUrl.toString());

  // If ?locale= is in the URL, persist it as a cookie for future page loads
  const localeParam = req.nextUrl.searchParams.get("locale");
  if (localeParam && LOCALES.has(localeParam)) {
    res.cookies.set(LOCALE_COOKIE, localeParam, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}

export const config = {
  // Run on all pages except static assets and API routes that don't need locale
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|manifest.json|robots.txt|sitemap.xml|api/).*)",
  ],
};
