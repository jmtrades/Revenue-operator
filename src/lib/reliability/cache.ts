/**
 * Permanent Last Known State Cache
 * Stores successful API responses in localStorage for graceful fallback on failures.
 */

const CACHE_PREFIX = "revenue_cache_";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedResponse<T> {
  data: T;
  timestamp: number;
}

export function getCachedResponse<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;
    const parsed: CachedResponse<T> = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function setCachedResponse<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const cached: CachedResponse<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

export function clearCache(key?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } else {
      // Clear all cache entries
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
}
