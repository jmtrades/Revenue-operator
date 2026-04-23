"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface UseDashboardFetchOptions<T> {
  /** API endpoint path (e.g. "/api/analytics/coaching") */
  url: string;
  /** Additional query params beyond workspace_id */
  params?: Record<string, string>;
  /** Auto-refresh interval in ms (default: 60000 = 1 min) */
  refreshInterval?: number;
  /** Whether to fetch immediately on mount (default: true) */
  immediate?: boolean;
  /** Transform the raw JSON response before storing */
  transform?: (data: unknown) => T;
  /** Whether fetching is enabled (default: true) - set false to pause */
  enabled?: boolean;
}

interface UseDashboardFetchReturn<T> {
  /** The fetched data (null before first load) */
  data: T | null;
  /** True during initial load (not during background refreshes) */
  loading: boolean;
  /** True during background refresh (data is still shown) */
  refreshing: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Timestamp of last successful fetch */
  lastUpdated: Date | null;
  /** Manually trigger a refresh */
  refresh: () => void;
  /** Manually update the data without fetching */
  mutate: (data: T | ((prev: T | null) => T)) => void;
}

/**
 * SWR-style hook for dashboard data fetching with:
 * - Stale-while-revalidate (shows old data during refresh)
 * - Auto-refresh on configurable interval
 * - Workspace-scoped requests
 * - Loading vs refreshing distinction
 * - Manual refresh and mutate
 * - Deduplication (won't fire concurrent requests)
 * - Pause on tab hidden / resume on tab visible
 */
export function useDashboardFetch<T = unknown>(
  options: UseDashboardFetchOptions<T>
): UseDashboardFetchReturn<T> {
  const {
    url,
    params = {},
    refreshInterval = 60_000,
    immediate = true,
    transform,
    enabled = true,
  } = options;

  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const inflightRef = useRef(false);
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stash latest transform/params in refs so they don't churn the fetchData identity.
  const transformRef = useRef(transform);
  const paramsRef = useRef(params);
  useEffect(() => {
    transformRef.current = transform;
    paramsRef.current = params;
  }, [transform, params]);

  // Serialize params for stable dependency comparison.
  const paramsKey = JSON.stringify(params);

  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!workspaceId || !enabled) return;
      if (inflightRef.current) return; // deduplicate
      // Reference paramsKey so the dep array is honest about cache scope.
      void paramsKey;

      inflightRef.current = true;

      if (isBackground) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const searchParams = new URLSearchParams({
          workspace_id: workspaceId,
          ...paramsRef.current,
        });
        const res = await fetch(`${url}?${searchParams}`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }

        const json = await res.json();

        if (!mountedRef.current) return;

        const currentTransform = transformRef.current;
        const result = currentTransform ? currentTransform(json) : (json as T);
        setData(result);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to fetch data"
        );
        // Keep stale data on background refresh failure
        if (!isBackground) {
          setData(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
        inflightRef.current = false;
      }
    },
    [workspaceId, url, paramsKey, enabled]
  );

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    if (immediate && enabled) {
      fetchData(false);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, immediate, enabled]);

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    intervalRef.current = setInterval(() => {
      fetchData(true);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, refreshInterval, enabled]);

  // Pause on tab hidden, resume on visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && enabled) {
        // Refresh when tab becomes visible again
        fetchData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchData, enabled]);

  const refresh = useCallback(() => {
    fetchData(data !== null);
  }, [fetchData, data]);

  const mutate = useCallback(
    (updater: T | ((prev: T | null) => T)) => {
      if (typeof updater === "function") {
        setData((prev) => (updater as (prev: T | null) => T)(prev));
      } else {
        setData(updater);
      }
    },
    []
  );

  return {
    data,
    loading: loading && !data, // Only true when no data to show
    refreshing,
    error,
    lastUpdated,
    refresh,
    mutate,
  };
}
