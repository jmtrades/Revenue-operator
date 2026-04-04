/**
 * Lead Brain Intelligence Cache
 *
 * In-memory LRU cache for lead intelligence to avoid recomputing on every call.
 * At scale, this prevents N+1 DB queries per lead per request.
 *
 * Cache strategy:
 * - TTL: 5 minutes (intelligence is re-computed frequently by cron)
 * - Max entries: 10,000 per process (prevents memory bloat)
 * - Invalidation: on lead state change, call completion, or manual flush
 */

import { computeLeadIntelligence, getLeadIntelligence, type LeadIntelligence } from "./lead-brain";

interface CacheEntry {
  data: LeadIntelligence;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 10_000;

/** Process-local LRU cache */
const cache = new Map<string, CacheEntry>();

function cacheKey(workspaceId: string, leadId: string): string {
  return `${workspaceId}:${leadId}`;
}

/** Evict oldest entries when cache is full */
function evictIfNeeded(): void {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  // Map iteration order is insertion order — delete the oldest 10%
  const toDelete = Math.floor(MAX_CACHE_ENTRIES * 0.1);
  let deleted = 0;
  for (const key of cache.keys()) {
    if (deleted >= toDelete) break;
    cache.delete(key);
    deleted++;
  }
}

/**
 * Get lead intelligence with caching.
 * 1. Check in-memory cache (fastest)
 * 2. Check persisted DB cache (fast, avoids full recompute)
 * 3. Full recompute (slowest, 6+ DB queries)
 */
export async function getCachedLeadIntelligence(
  workspaceId: string,
  leadId: string,
  options?: { forceRefresh?: boolean; maxAgeMs?: number }
): Promise<LeadIntelligence> {
  const key = cacheKey(workspaceId, leadId);
  const maxAge = options?.maxAgeMs ?? CACHE_TTL_MS;

  // 1. Check in-memory cache
  if (!options?.forceRefresh) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      // Move to end for LRU behavior
      cache.delete(key);
      cache.set(key, cached);
      return cached.data;
    }
  }

  // 2. Check persisted DB cache
  if (!options?.forceRefresh) {
    const persisted = await getLeadIntelligence(workspaceId, leadId);
    if (persisted) {
      const computedAt = new Date(persisted.computed_at).getTime();
      if (Date.now() - computedAt < maxAge) {
        // Fresh enough — cache in memory and return
        const entry: CacheEntry = { data: persisted, expiresAt: Date.now() + CACHE_TTL_MS };
        cache.set(key, entry);
        evictIfNeeded();
        return persisted;
      }
    }
  }

  // 3. Full recompute
  const fresh = await computeLeadIntelligence(workspaceId, leadId);

  // Cache in memory
  const entry: CacheEntry = { data: fresh, expiresAt: Date.now() + CACHE_TTL_MS };
  cache.set(key, entry);
  evictIfNeeded();

  return fresh;
}

/**
 * Invalidate cache for a specific lead (call after state changes).
 */
export function invalidateLeadCache(workspaceId: string, leadId: string): void {
  cache.delete(cacheKey(workspaceId, leadId));
}

/**
 * Invalidate all cached intelligence for a workspace.
 */
export function invalidateWorkspaceCache(workspaceId: string): void {
  const prefix = `${workspaceId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Flush the entire cache (for testing or deployment).
 */
export function flushIntelligenceCache(): void {
  cache.clear();
}

/**
 * Get cache stats for monitoring.
 */
export function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return { size: cache.size, maxSize: MAX_CACHE_ENTRIES, ttlMs: CACHE_TTL_MS };
}
