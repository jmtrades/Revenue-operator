/**
 * Rate limiter for voice operations.
 * Tracks requests in memory with time-window resets.
 * Use for concurrent call limits, demo request throttling, and voice clone quotas.
 */

export type BillingTier = "free" | "pro" | "enterprise";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
}

/**
 * Simple in-memory rate limiter with time-window reset.
 */
class VoiceRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  /**
   * Check if a request is within the rate limit.
   * @param key Unique identifier (workspace_id, IP, etc)
   * @param maxRequests Maximum requests in window
   * @param windowMs Time window in milliseconds
   * @returns { allowed, remaining, resetIn }
   */
  check(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.limits.get(key);

    // If no entry or window has expired, reset
    if (!entry || now >= entry.resetAt) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      this.limits.set(key, newEntry);
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetIn: windowMs,
      };
    }

    // Window still active, check count
    const allowed = entry.count < maxRequests;
    if (allowed) {
      entry.count += 1;
    }

    const resetIn = Math.max(0, entry.resetAt - now);
    return {
      allowed,
      remaining: Math.max(0, maxRequests - entry.count),
      resetIn,
    };
  }

  /**
   * Check concurrent call limits for a workspace based on billing tier.
   * Maps tier to max concurrent calls, then checks against current active calls.
   * @param workspaceId The workspace ID
   * @param tier The billing tier (free, pro, enterprise)
   * @returns { allowed: boolean }
   */
  checkConcurrentCalls(
    workspaceId: string,
    tier: BillingTier
  ): { allowed: boolean } {
    const tierLimits: Record<BillingTier, number> = {
      free: 1,
      pro: 5,
      enterprise: 50,
    };

    const maxConcurrent = tierLimits[tier];
    const key = `concurrent:${workspaceId}`;

    // This is a simplified check. In production, query active call_sessions from DB
    // For now, return a placeholder indicating the tier allows this
    const entry = this.limits.get(key);
    const currentCount = entry?.count ?? 0;

    return {
      allowed: currentCount < maxConcurrent,
    };
  }

  /**
   * Check demo request rate limit (e.g., preview calls, voice tests).
   * Limits demo requests per IP to prevent abuse.
   * @param ip Client IP address
   * @returns { allowed: boolean }
   */
  checkDemoRequests(ip: string): { allowed: boolean } {
    // 10 demo requests per IP per hour
    const result = this.check(`demo:${ip}`, 10, 60 * 60 * 1000);
    return {
      allowed: result.allowed,
    };
  }

  /**
   * Check voice clone request quota per workspace.
   * Limits how many voice clones can be created per day.
   * @param workspaceId The workspace ID
   * @returns { allowed: boolean }
   */
  checkCloneRequests(workspaceId: string): { allowed: boolean } {
    // 5 voice clones per workspace per day
    const result = this.check(`clone:${workspaceId}`, 5, 24 * 60 * 60 * 1000);
    return {
      allowed: result.allowed,
    };
  }

  /**
   * Reset a specific rate limit (for testing or manual reset).
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits (for testing).
   */
  clearAll(): void {
    this.limits.clear();
  }
}

export const voiceRateLimiter = new VoiceRateLimiter();
