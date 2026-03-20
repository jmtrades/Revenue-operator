/**
 * Distributed rate limiting using Upstash Redis.
 * Uses sliding window algorithm keyed by ip or workspace.
 */

import { Ratelimit } from "@upstash/ratelimit";

import { Redis } from "@upstash/redis";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  upstashUrl && upstashToken
    ? new Redis({ url: upstashUrl, token: upstashToken })
    : null;

const limiterCache = new Map<string, Ratelimit>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000,
): Promise<RateLimitResult> {
  if (!redis) {
    // In production, fail closed — deny if Redis unavailable
    if (process.env.NODE_ENV === "production") {
      return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
    }
    // Dev/test: allow all when Redis not configured
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const bucket = `${limit}:${windowMs}`;
  let ratelimit = limiterCache.get(bucket);
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
      prefix: "rt_rl",
    });
    limiterCache.set(bucket, ratelimit);
  }

  const res = await ratelimit.limit(key);
  return {
    allowed: res.success,
    remaining: res.remaining,
    resetAt: res.reset,
  };
}

export function getClientIp(req: Request): string {
  return (
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

