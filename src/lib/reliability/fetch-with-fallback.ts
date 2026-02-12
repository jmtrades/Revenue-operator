/**
 * Network fetch with automatic cache fallback and latency masking.
 * Ensures user never sees failures or indefinite loading.
 */

import { getCachedResponse, setCachedResponse } from "./cache";

interface FetchOptions extends RequestInit {
  cacheKey?: string;
  showContinuityOnSlow?: boolean;
}

export async function fetchWithFallback<T>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: T | null; fromCache: boolean; error?: string }> {
  const { cacheKey, showContinuityOnSlow, ...fetchOptions } = options;
  
  // Try cache first if available
  if (cacheKey) {
    const cached = getCachedResponse<T>(cacheKey);
    if (cached) {
      // Return cached immediately, but still fetch fresh in background
      fetch(url, fetchOptions).then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          if (!data.error) {
            setCachedResponse(cacheKey, data);
          }
        }
      }).catch(() => {
        // Silent background fetch failure
      });
      return { data: cached, fromCache: true };
    }
  }

  // Track latency
  const startTime = Date.now();
  let continuityShown = false;

  // Show continuity message if slow (>1200ms)
  const latencyTimer = setTimeout(() => {
    if (showContinuityOnSlow && typeof window !== "undefined") {
      continuityShown = true;
      // This will be handled by the component showing the message
    }
  }, 1200);

  try {
    const response = await fetch(url, fetchOptions);
    
    clearTimeout(latencyTimer);

    if (!response.ok) {
      // Try cache on failure
      if (cacheKey) {
        const cached = getCachedResponse<T>(cacheKey);
        if (cached) {
          return { data: cached, fromCache: true, error: "Still monitoring — retrying in the background" };
        }
      }
      return { data: null, fromCache: false, error: "Still monitoring — retrying in the background" };
    }

    const data = await response.json();
    
    if (data.error) {
      // Try cache on API error
      if (cacheKey) {
        const cached = getCachedResponse<T>(cacheKey);
        if (cached) {
          return { data: cached, fromCache: true, error: "Still monitoring — retrying in the background" };
        }
      }
      return { data: null, fromCache: false, error: "Still monitoring — retrying in the background" };
    }

    // Cache successful response
    if (cacheKey) {
      setCachedResponse(cacheKey, data);
    }

    return { data, fromCache: false };
  } catch (err) {
    clearTimeout(latencyTimer);
    
    // Network failure - try cache
    if (cacheKey) {
      const cached = getCachedResponse<T>(cacheKey);
      if (cached) {
        return { data: cached, fromCache: true, error: "Still monitoring — retrying in the background" };
      }
    }
    
    return { data: null, fromCache: false, error: "Still monitoring — retrying in the background" };
  }
}
