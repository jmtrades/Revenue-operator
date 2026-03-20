/**
 * Rate limiter for voice operations.
 * Tracks requests in memory with time-window resets.
 * Use for concurrent call limits, demo request throttling, and voice clone quotas.
 */

import type { BillingTier } from "@/lib/feature-gate/types";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
}

/** Concurrent call limits aligned with billing-plans.ts and VOICE_TIER_LIMITS */
const CONCURRENT_CALL_LIMITS: Record<BillingTier, number> = {
  solo: 2,
  business: 10,
  scale: 25,
  enterprise: 100,
};

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
   * Check concurrent call limits for a workspace.
   * Queries active call_sessions from DB via the provided getter.
   * Falls back to in-memory tracking if no DB getter is supplied.
   */
  async checkConcurrentCallsFromDb(
    workspaceId: string,
    tier: BillingTier,
    getActiveCalls: () => Promise<number>
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const limit = CONCURRENT_CALL_LIMITS[tier] ?? 2;

    try {
      const current = await getActiveCalls();
      return { allowed: current < limit, current, limit };
    } catch {
      // DB lookup failed — fall back to in-memory
      return this.checkConcurrentCallsSync(workspaceId, tier);
    }
  }

  /**
   * Synchronous in-memory concurrent call check (fallback / fast path).
   */
  checkConcurrentCallsSync(
    workspaceId: string,
    tier: BillingTier
  ): { allowed: boolean; current: number; limit: number } {
    const limit = CONCURRENT_CALL_LIMITS[tier] ?? 2;
    const key = `concurrent:${workspaceId}`;
    const entry = this.limits.get(key);
    const current = entry?.count ?? 0;

    return { allowed: current < limit, current, limit };
  }

  /**
   * Increment the in-memory concurrent call counter (call on call start).
   */
  incrementConcurrent(workspaceId: string): void {
    const key = `concurrent:${workspaceId}`;
    const entry = this.limits.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      // 1-hour window for stale entry cleanup
      this.limits.set(key, { count: 1, resetAt: Date.now() + 60 * 60 * 1000 });
    }
  }

  /**
   * Decrement the in-memory concurrent call counter (call on call end).
   */
  decrementConcurrent(workspaceId: string): void {
    const key = `concurrent:${workspaceId}`;
    const entry = this.limits.get(key);
    if (entry && entry.count > 0) {
      entry.count -= 1;
    }
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
    return { allowed: result.allowed };
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
    return { allowed: result.allowed };
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
