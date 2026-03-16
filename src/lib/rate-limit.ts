/**
 * Simple in-memory sliding-window rate limiter.
 * Not distributed — works per-instance. Good enough for single-server / Vercel serverless.
 * For production scale, swap with Upstash Redis or Vercel KV.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Cleanup stale entries every 60s to prevent memory leaks
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60_000);
  // Don't hold the process open
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key.
 * @param key   Unique identifier (e.g., IP address, workspace ID)
 * @param limit Max requests per window
 * @param windowMs Window duration in milliseconds (default: 60_000 = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000,
): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract client IP from request (works with Vercel, Cloudflare, etc.)
 */
export function getClientIp(req: Request): string {
  return (
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
