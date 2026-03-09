"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rt_build_id";

export function StaleBuildBanner() {
  const [show, setShow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const check = useCallback(() => {
    fetch("/api/build-id", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: { buildId?: string }) => {
        const serverId = data?.buildId ?? "";
        if (!serverId) return;
        try {
          const stored = sessionStorage.getItem(STORAGE_KEY);
          if (stored !== null && stored !== serverId) {
            setShow(true);
            return;
          }
          if (stored === null) sessionStorage.setItem(STORAGE_KEY, serverId);
        } catch {
          // ignore
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [check]);

  // Auto-dismiss after 10 seconds if user doesn't refresh
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(false), 10000);
    return () => window.clearTimeout(t);
  }, [show]);

  const handleRefresh = () => {
    setRefreshing(true);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    }
    if ("caches" in window) {
      window.caches.keys().then((names) => names.forEach((n) => window.caches.delete(n)));
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, "");
    } catch {
      // ignore
    }
    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 300);
  };

  if (!show) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-lg shadow-2xl px-4 py-3 flex items-center gap-3 max-w-xs"
      aria-live="polite"
    >
      <p className="text-sm text-[var(--text-secondary)]">Update available</p>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="text-sm font-medium text-[var(--accent-blue)] hover:underline whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none rounded"
      >
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}
