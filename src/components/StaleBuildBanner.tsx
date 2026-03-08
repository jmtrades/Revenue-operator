"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rt_build_id";

export function StaleBuildBanner() {
  const [show, setShow] = useState(false);

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

  const handleRefresh = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "");
    } catch {
      // ignore
    }
    // Clear caches and unregister service workers so reload gets latest
    if ("caches" in window) {
      window.caches.keys().then((names) => {
        names.forEach((name) => window.caches.delete(name));
      });
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-[100] flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:max-w-md"
      aria-live="polite"
    >
      <p className="text-sm text-amber-200">A new version is available. Refresh to get the latest.</p>
      <button
        type="button"
        onClick={handleRefresh}
        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-zinc-100"
      >
        Refresh
      </button>
    </div>
  );
}
