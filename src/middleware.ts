import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Only initialize if Upstash env vars are configured
const ratelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, "60 s"), // 60 requests per minute per IP
      analytics: true,
      prefix: "ratelimit:global",
    })
  : null;

// Stricter limit for auth endpoints
const authRatelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 per minute
      analytics: true,
      prefix: "ratelimit:auth",
    })
  : null;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip rate limiting for static assets and internal routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/cron") || // Cron jobs have their own auth
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/system/health")
  ) {
    return NextResponse.next();
  }

  // Get IP for rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
             req.headers.get("x-real-ip") ??
             "anonymous";

  // Apply stricter rate limit to auth endpoints
  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/trial/")) {
    if (authRatelimit) {
      const { success, remaining } = await authRatelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "X-RateLimit-Remaining": String(remaining), "Retry-After": "60" } }
        );
      }
    }
    return NextResponse.next();
  }

  // Apply general rate limit to all API routes
  if (pathname.startsWith("/api/")) {
    if (ratelimit) {
      const { success, remaining } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "X-RateLimit-Remaining": String(remaining), "Retry-After": "60" } }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
