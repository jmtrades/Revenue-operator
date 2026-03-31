/**
 * Network fetch with automatic cache fallback and latency masking.
 * Ensures user never sees failures or indefinite loading.
 * All requests are capped by DEFAULT_TIMEOUT_MS so they cannot hang indefinitely.
 */

import { getCachedResponse, setCachedResponse } from "./cache";

const DEFAULT_TIMEOUT_MS = 15_000;

interface FetchOptions extends RequestInit {
  cacheKey?: string;
  showContinuityOnSlow?: boolean;
  /** Override default request timeout (ms). Default 15s. */
  timeoutMs?: number;
}

export async function fetchWithFallback<T>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: T | null; fromCache: boolean; error?: string }> {
  const { cacheKey, showContinuityOnSlow, timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  // Try cache first if available
  if (cacheKey) {
    const cached = getCachedResponse<T>(cacheKey);
    if (cached) {
      // Return cached immediately, but still fetch fresh in background (with timeout)
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);
      fetch(url, { ...fetchOptions, signal: controller.signal })
        .then(async (r) => {
          clearTimeout(tid);
          if (r.ok) {
            const data = await r.json();
            if (!data.error) setCachedResponse(cacheKey, data);
          }
        })
        .catch(() => {});
      return { data: cached, fromCache: true };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const mergedOptions: RequestInit = { ...fetchOptions, signal: controller.signal };

  // Track latency
  const latencyTimer = setTimeout(() => {
    if (showContinuityOnSlow && typeof window !== "undefined") {
      // Handled by component
    }
  }, 1200);

  try {
    const response = await fetch(url, mergedOptions);
    clearTimeout(timeoutId);

    clearTimeout(latencyTimer);

    if (!response.ok) {
      // Handle session expiry - redirect to login
      if (response.status === 401 && typeof window !== "undefined") {
        window.location.href = "/login?reason=session_expired";
        return { data: null, fromCache: false, error: "Session expired. Redirecting to login." };
      }

      // Try cache on failure
      if (cacheKey) {
        const cached = getCachedResponse<T>(cacheKey);
        if (cached) {
          return { data: cached, fromCache: true, error: "Data remains from last view." };
        }
      }
      return { data: null, fromCache: false, error: "Normal conditions are not present." };
    }

    const data = await response.json();
    
    if (data.error) {
      // Try cache on API error
      if (cacheKey) {
        const cached = getCachedResponse<T>(cacheKey);
        if (cached) {
          return { data: cached, fromCache: true, error: "Data remains from last view." };
        }
      }
      return { data: null, fromCache: false, error: "Normal conditions are not present." };
    }

    // Cache successful response
    if (cacheKey) {
      setCachedResponse(cacheKey, data);
    }

    return { data, fromCache: false };
  } catch (_err) {
    clearTimeout(timeoutId);
    clearTimeout(latencyTimer);

    // Network failure or timeout - try cache
    if (cacheKey) {
      const cached = getCachedResponse<T>(cacheKey);
      if (cached) {
        return { data: cached, fromCache: true, error: "Data remains from last view." };
      }
    }
    
    return { data: null, fromCache: false, error: "Normal conditions are not present." };
  }
}
